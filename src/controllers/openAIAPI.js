const OpenAI = require('openai');
const fs = require('fs');
const client = new OpenAI({
});

async function waitOnRun(run, thread) {
  while (run.status === 'queued' || run.status === 'in_progress') {
    run = await client.beta.threads.runs.retrieve(thread.id, run.id);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return run;
}

async function getPrompt(question, filePath = null) {
  try {
    let file_id = null;

    // file provided then it will work
    if (filePath) {
      const file = await client.files.create({
        file: fs.createReadStream(filePath),
        purpose: 'assistants',
      });
      file_id = file.id;
      question += ` You can refer to the file with ID: ${file_id}`;
      console.log(question);
    }

    // Create an assistant
    const assistant = await client.beta.assistants.create({
      name: 'Math tutor',
      instructions:
        'I am a math tutor. I can help you with your math homework.',
      tools: [{ type: 'file_search' }, { type: 'code_interpreter' }],
      model: 'gpt-4-0125-preview',
      tool_resources: {
        code_interpreter: {
          file_ids: [file_id],
        },
      },
    });

    // Create a new thread
    const thread = await client.beta.threads.create(); // Send the question to the thread
    await client.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: question,
      // file_ids: [file_id] // Uncomment if file_ids need to be sent with message
    });

    // Execute the thread
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    // Retrieve the run result
    const completedRun = await waitOnRun(run, thread);
    // Get the last message from the thread which is assumed to be the answer
    const messages = await client.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];
    const response = lastMessage.content[0].text.value;
    console.log(response);
    return response;
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    return null;
  }
}

// Example usage of the getPrompt function
// const answer1 = await getPrompt("What is the best time to visit Paris?");  // No file provided
async function uploadFileAskQues(req, res) {
  try {
    const fileDetails = req.file;
    const question = req.body.question;
    const answer2 = await getPrompt(
      question,
      // 'Can you analyze the data in this file and tell me the max value?',
      req.file.path
    ); // File provided
    res.status(200).json({
      answer2,
    });
  } catch (error) {
    res.json({ message: error });
  }
}

module.exports = uploadFileAskQues;

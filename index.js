import { ChatGroq } from "@langchain/groq";
import {
  MemorySaver,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import readline from "readline/promises";
import dotenv from "dotenv";
dotenv.config();
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { SerpAPI } from "@langchain/community/tools/serpapi";

const serpApiTool = new SerpAPI(process.env.SERPAPI_KEY);

// initilize the tools node
const tools = [serpApiTool];
const toolNode = new ToolNode(tools);
const checkPointer = new MemorySaver();

/**
  1. Define a node function 
  2. Build the graph
  3. compile and invoke the graph

 */
// Initilize the LLM
const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
  //   maxTokens: undefined,
  maxRetries: 2,
  apiKey: process.env.GROQ_API_KEY,
}).bindTools([serpApiTool]);

// 1. Define a node function
async function callModel(state) {
  // call the LLM using APIs
  const response = await llm.invoke(state.messages);
  console.log("Calling LLM....");
  return { messages: [response] };
}

// contional edges
function shouldContinue(state) {
  // put your condtion
  // wether to call a tool or end
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage?.tool_calls?.length > 0) {
    // LLM requested a tool
    return "tools";
  }
  console.log("shld state", state);
  return "__end__";
}

// 2 Build the graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

// 3. compile and invoke the graph
const app = workflow.compile(checkPointer);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  while (true) {
    const userInput = await rl.question("You : ");
    if (
      userInput.toLowerCase() === "exit" ||
      userInput.toLowerCase() === "quit" ||
      userInput.toLowerCase() === "bye"
    ) {
      console.log("Exiting...");
      break;
    }

    const finalState = await app.invoke(
      {
        messages: [{ role: "user", content: userInput }],
      },
      { configurable: { thread_id: "1" } }
    );
    const lastMessages = finalState.messages[finalState.messages.length - 1];
    console.log(`AI :`, lastMessages.content);
  }

  rl.close();
}

main();

















// import { ChatGroq } from "@langchain/groq";
// import readline from "readline/promises";
// import dotenv from "dotenv";
// dotenv.config();
// import { SerpAPI } from "@langchain/community/tools/serpapi";

// const serpApiTool = new SerpAPI(process.env.SERPAPI_KEY);

// // Initialize the LLM
// const llm = new ChatGroq({
//   model: "openai/gpt-oss-120b",
//   temperature: 0,
//   maxRetries: 2,
//   apiKey: process.env.GROQ_API_KEY,
// }).bindTools([serpApiTool]);

// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout,
// });

// async function main() {
//   // Store conversation history manually
//   let conversationHistory = [];
  
//   while (true) {
//     const userInput = await rl.question("You : ");
//     if (
//       userInput.toLowerCase() === "exit" ||
//       userInput.toLowerCase() === "quit" ||
//       userInput.toLowerCase() === "bye"
//     ) {
//       console.log("Exiting...");
//       break;
//     }

//     // Add user message to history
//     conversationHistory.push({ role: "user", content: userInput });
    
//     try {
//       // Call the LLM with the entire conversation history
//       const response = await llm.invoke(conversationHistory);
      
//       // Add AI response to history
//       conversationHistory.push(response);
      
//       // Extract the content from the response
//       let aiResponse = response.content;
      
//       // Check if there are tool calls
//       if (response.tool_calls && response.tool_calls.length > 0) {
//         // If there are tool calls, execute them and get the results
//         for (const toolCall of response.tool_calls) {
//           const tool = serpApiTool;
//           const toolResult = await tool.invoke(toolCall.args);
          
//           // Add tool result to conversation history
//           conversationHistory.push({
//             role: "tool",
//             content: JSON.stringify(toolResult),
//             tool_call_id: toolCall.id,
//           });
//         }
        
//         // Call the LLM again with the tool results
//         const secondResponse = await llm.invoke(conversationHistory);
//         conversationHistory.push(secondResponse);
//         aiResponse = secondResponse.content;
//       }
      
//       console.log(`AI :`, aiResponse);
//     } catch (error) {
//       console.error("Error:", error.message);
//     }
//   }

//   rl.close();
// }

// main();
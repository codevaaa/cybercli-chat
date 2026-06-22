import json
import random
import os

# This is a template script to format data into ChatML for Unsloth.
# Run this locally or inside Kaggle to prepare your custom fine-tuning data.

def create_react_trace(instruction, plan, code, verify="Verified logic successfully."):
    """Creates a conversation trace enforcing the ReAct format."""
    return {
        "conversations": [
            {
                "from": "human",
                "value": instruction
            },
            {
                "from": "gpt",
                "value": f"<plan>\n{plan}\n</plan>\n<execute>\n{code}\n</execute>\n<verify>\n{verify}\n</verify>"
            }
        ]
    }

def main():
    print("Generating synthetic ReAct dataset for Brahma-v1...")
    
    # We create a tiny mock dataset here.
    # In reality, you would use Hugging Face datasets:
    # from datasets import load_dataset
    # ds = load_dataset("m-a-p/CodeFeedback-Filtered-Instruction")
    
    mock_data = [
        create_react_trace(
            instruction="Write a python function to reverse a string.",
            plan="1. Accept a string as input.\n2. Use Python's slicing feature `[::-1]` to reverse it.\n3. Return the result.",
            code="def reverse_string(s):\n    return s[::-1]",
            verify="Tested with 'hello' -> 'olleh'. Works optimally."
        ),
        create_react_trace(
            instruction="How to connect to MongoDB in Node.js?",
            plan="1. Import MongoClient from 'mongodb'.\n2. Create a connection string.\n3. Await the connection and return the db instance.",
            code="const { MongoClient } = require('mongodb');\nasync function connect() {\n  const client = new MongoClient('mongodb://localhost:27017');\n  await client.connect();\n  return client.db('test');\n}",
            verify="Connection established. Added async/await for modern JS standards."
        ),
        create_react_trace(
            instruction="Bhai, array ko sort kaise karu JavaScript mein numbers ke liye?",
            plan="1. User is asking in Hinglish about sorting number arrays in JS.\n2. Explain that `.sort()` sorts alphabetically by default.\n3. Show how to use a compare function `(a, b) => a - b`.",
            code="const numbers = [4, 2, 5, 1, 3];\nnumbers.sort((a, b) => a - b);\nconsole.log(numbers);",
            verify="Array sorted ascending correctly using comparator. Hindi explanation ready."
        )
    ]
    
    # Mix in 35% Hinglish/Indic context (simulated here)
    # Mix in 65% Complex Coding (simulated here)
    
    output_path = "brahma_v1_dataset.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(mock_data, f, indent=2)
        
    print(f"Successfully wrote {len(mock_data)} examples to {output_path}.")
    print("You can upload this JSON to Kaggle/Colab and load it directly into Unsloth!")

if __name__ == "__main__":
    main()

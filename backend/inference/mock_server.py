from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import asyncio
import json
import time
import uuid

app = FastAPI(title="Codeva Inference Mock Server (Brahma-v1)")

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Brahma Inference Server is ready"}

@app.get("/v1/models")
async def list_models():
    return {
        "object": "list",
        "data": [
            {
                "id": "brahma-v1",
                "object": "model",
                "created": 1700000000,
                "owned_by": "codeva"
            }
        ]
    }

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    model = body.get("model", "brahma-v1")
    messages = body.get("messages", [])
    stream = body.get("stream", False)
    
    # Extract user prompt
    last_msg = messages[-1]["content"] if messages else ""
    
    # Generate mock response
    mock_reply = f"[Mock Brahma-v1] Received your request: '{last_msg}'. This is a mock response from the Python GPU Inference server placeholder. Replace this logic with actual vLLM / llama.cpp inference."
    
    if stream:
        async def event_generator():
            completion_id = f"chatcmpl-{uuid.uuid4().hex}"
            created_time = int(time.time())
            
            # Send chunks word by word to simulate streaming
            words = mock_reply.split(" ")
            for word in words:
                chunk = {
                    "id": completion_id,
                    "object": "chat.completion.chunk",
                    "created": created_time,
                    "model": model,
                    "choices": [{"delta": {"content": word + " "}, "index": 0, "finish_reason": None}]
                }
                yield f"data: {json.dumps(chunk)}\n\n"
                await asyncio.sleep(0.05) # Simulate token generation delay
                
            # Send stop token
            stop_chunk = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created_time,
                "model": model,
                "choices": [{"delta": {}, "index": 0, "finish_reason": "stop"}]
            }
            yield f"data: {json.dumps(stop_chunk)}\n\n"
            yield "data: [DONE]\n\n"
            
        return StreamingResponse(event_generator(), media_type="text/event-stream")
    else:
        # Non-streaming response
        return {
            "id": f"chatcmpl-{uuid.uuid4().hex}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": mock_reply
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": len(last_msg.split()),
                "completion_tokens": len(mock_reply.split()),
                "total_tokens": len(last_msg.split()) + len(mock_reply.split())
            }
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("mock_server:app", host="0.0.0.0", port=8000, reload=True)

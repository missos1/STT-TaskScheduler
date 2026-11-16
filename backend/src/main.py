import secrets
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="STT Task Scheduler",)

rooms: dict[str, dict] = {}  

class CreateRoomRequest(BaseModel):
    meet_code: str
    host_name: str
    
class CloseRoomRequest(BaseModel):
    meet_code: str
    host_name: str
    host_token: str
    
@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/rooms/close", status_code = 201)
def close_room(payload: CloseRoomRequest):
    room = rooms.get(payload.meet_code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room["host_token"] != payload.host_token:
        raise HTTPException(status_code=403, detail="Invalid host token")
    
    if room["status"] == "closed":
        raise HTTPException(status_code=409, detail="Room is already closed")
    
    room["status"] = "closed"
    return {
        "meet_code": payload.meet_code,
        "status": "closed",
    }

@app.post("/api/rooms/create", status_code = 201)
def create_room(payload: CreateRoomRequest):
    if payload.meet_code in rooms and rooms[payload.meet_code]["status"] == "active":
        raise HTTPException(status_code=409, detail="Room is already active")
    
    host_token = secrets.token_urlsafe(16)
    
    rooms[payload.meet_code] = {
        "meet_code": payload.meet_code,
        "host_name": payload.host_name,
        "host_token": host_token,
        "status": "active",
        "transcript": [],
    }
    
    return {
        "meet_code": payload.meet_code,
        "status": "active",
        "host_token": host_token
    }
    
@app.get("/api/rooms/check/{meet_code}")
def check_room(meet_code: str):
    room = rooms.get(meet_code)
    if not room:
        return {
            "meet_code": meet_code, "active": False, "status": "not_created"
        }
    
    return {
        "meet_code": meet_code,
        "active": room["status"] == "active",
        "status": room["status"]
    }
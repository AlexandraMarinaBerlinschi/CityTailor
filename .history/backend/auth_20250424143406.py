from fastapi import APIRouter, HTTPException, Request
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@router.post("/api/signup")
async def signup(request: Request):
    body = await request.json()
    email = body.get("email")
    password = body.get("password")

    try:
        response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })

        print("RESPONSE SIGNUP:", response)

        user_id = response.user.id

        supabase.table("users").insert({
            "id": user_id,
            "email": email,
            "role": "user"
        }).execute()

        return {"message": "User created successfully"}

    except Exception as e:
        print("ERROR DURING SIGNUP:", str(e))
        raise HTTPException(status_code=500, detail="Signup failed")


@router.post("/api/signup")
async def signup(request: Request):
    body = await request.json()
    email = body.get("email")
    password = body.get("password")
    username = body.get("username")  # ✅ adăugat

    try:
        response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })

        if response.error:
            raise HTTPException(status_code=400, detail=str(response.error.message))

        user_id = response.user.id

        supabase.table("users").insert({
            "id": user_id,
            "email": email,
            "username": username,  # ✅ inserăm și username
            "role": "user"
        }).execute()

        return {"message": "User created successfully"}

    except Exception as e:
        print("ERROR DURING SIGNUP:", str(e))
        raise HTTPException(status_code=500, detail="Signup failed")

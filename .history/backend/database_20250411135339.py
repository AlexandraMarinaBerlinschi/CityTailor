#pw : 7W80PDSCrWT23ZHv
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv
import re

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    masked_url = re.sub(r':(.*?)@', ':***@', DATABASE_URL)
    print(f"Connecting to: {masked_url}")
else:
    print("WARNING: DATABASE_URL is not set!")

engine = create_async_engine(
    DATABASE_URL,
    echo=True,  
    pool_size=5,  
    max_overflow=10,  
    pool_pre_ping=True,  
    pool_recycle=3600 
)

Base = declarative_base()

async_session = async_sessionmaker(
    engine,
    expire_on_commit=False,  
    class_=AsyncSession
)

async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
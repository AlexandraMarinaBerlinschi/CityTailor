from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

# password : 8U97aH9pgL08GVDy
DATABASE_URL = "postgresql://postgres:8U97aH9pgL08GVDy@db.rokghrvqbznglgowksgf.supabase.co:5432/postgres"

engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

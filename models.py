from sqlalchemy import Column, Integer, String, TIMESTAMP, text
from database import Base

class Preference(Base):
    __tablename__ = "preferences"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    activities = Column(String)
    time = Column(String)

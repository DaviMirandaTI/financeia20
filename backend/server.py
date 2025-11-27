from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Lancamento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    data: str
    descricao: str
    categoria: str
    tipo: str  # 'entrada' | 'saida'
    valor: float
    forma: str  # 'pix' | 'debito' | 'credito' | 'dinheiro' | 'boleto' | 'outro'
    origem: Optional[str] = None  # 'manual' | 'fixo'
    observacao: Optional[str] = None

class Fixo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    descricao: str
    categoria: str
    tipo: str  # 'entrada' | 'saida'
    valor: float
    responsavel: str  # 'Davi' | 'Ana' | 'Outro'
    diaVencimento: int  # 1 a 31
    mesInicio: str  # YYYY-MM
    mesFim: Optional[str] = None
    ativo: bool = True

class Investimento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    data: str
    ativo: str  # BNB, BTC, etc.
    valor: float
    origem: Optional[str] = None
    observacao: Optional[str] = None

# Routes
@api_router.get("/")
async def root():
    return {"message": "FinSystem Davi API"}

@api_router.get("/health")
async def health():
    return {"status": "ok"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
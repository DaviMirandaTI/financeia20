from fastapi import FastAPI, APIRouter, HTTPException, status
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
    model_config = ConfigDict(extra="ignore", populate_by_name=True, arbitrary_types_allowed=True)
    
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
    model_config = ConfigDict(extra="ignore", populate_by_name=True, arbitrary_types_allowed=True)
    
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
    model_config = ConfigDict(extra="ignore", populate_by_name=True, arbitrary_types_allowed=True)
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    data: str
    ativo: str  # BNB, BTC, etc.
    valor: float
    origem: Optional[str] = None
    observacao: Optional[str] = None

# Helper to serialize mongo docs
def mongo_to_dict(doc):
    doc["_id"] = str(doc["_id"])
    return doc

# --- API Routes ---

@api_router.get("/")
async def root():
    return {"message": "FinSystem Davi API"}

@api_router.get("/health")
async def health():
    return {"status": "ok"}

# --- Lancamentos CRUD ---
@api_router.get("/lancamentos", response_model=List[Lancamento])
async def get_all_lancamentos():
    lancamentos_cursor = db.lancamentos.find({})
    return [mongo_to_dict(l) async for l in lancamentos_cursor]

@api_router.post("/lancamentos", response_model=Lancamento, status_code=status.HTTP_201_CREATED)
async def create_lancamento(lancamento: Lancamento):
    await db.lancamentos.insert_one(lancamento.model_dump(by_alias=True))
    return lancamento

@api_router.put("/lancamentos/{lancamento_id}", response_model=Lancamento)
async def update_lancamento(lancamento_id: str, lancamento_data: Lancamento):
    result = await db.lancamentos.replace_one({"id": lancamento_id}, lancamento_data.model_dump(by_alias=True))
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lancamento not found")
    return lancamento_data

@api_router.delete("/lancamentos/{lancamento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lancamento(lancamento_id: str):
    result = await db.lancamentos.delete_one({"id": lancamento_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lancamento not found")
    return

# --- Fixos CRUD ---
@api_router.get("/fixos", response_model=List[Fixo])
async def get_all_fixos():
    fixos_cursor = db.fixos.find({})
    return [mongo_to_dict(f) async for f in fixos_cursor]

@api_router.post("/fixos", response_model=Fixo, status_code=status.HTTP_201_CREATED)
async def create_fixo(fixo: Fixo):
    await db.fixos.insert_one(fixo.model_dump(by_alias=True))
    return fixo

@api_router.put("/fixos/{fixo_id}", response_model=Fixo)
async def update_fixo(fixo_id: str, fixo_data: Fixo):
    result = await db.fixos.replace_one({"id": fixo_id}, fixo_data.model_dump(by_alias=True))
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fixo not found")
    return fixo_data

@api_router.delete("/fixos/{fixo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fixo(fixo_id: str):
    result = await db.fixos.delete_one({"id": fixo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fixo not found")
    return

# --- Investimentos CRUD ---
@api_router.get("/investimentos", response_model=List[Investimento])
async def get_all_investimentos():
    investimentos_cursor = db.investimentos.find({})
    return [mongo_to_dict(i) async for i in investimentos_cursor]

@api_router.post("/investimentos", response_model=Investimento, status_code=status.HTTP_201_CREATED)
async def create_investimento(investimento: Investimento):
    await db.investimentos.insert_one(investimento.model_dump(by_alias=True))
    return investimento

@api_router.put("/investimentos/{investimento_id}", response_model=Investimento)
async def update_investimento(investimento_id: str, investimento_data: Investimento):
    result = await db.investimentos.replace_one({"id": investimento_id}, investimento_data.model_dump(by_alias=True))
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Investimento not found")
    return investimento_data

@api_router.delete("/investimentos/{investimento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_investimento(investimento_id: str):
    result = await db.investimentos.delete_one({"id": investimento_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Investimento not found")
    return


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

@app.on_event("startup")
async def startup_db_client():
    try:
        # Send a ping to confirm a successful connection
        await client.admin.command('ping')
        logger.info("Pinged your deployment. You successfully connected to MongoDB!")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
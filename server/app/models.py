from pydantic import BaseModel
from typing import List, Optional


class Detection(BaseModel):
    """单次检测结果"""
    startTime: str
    endTime: str
    scientificName: str
    commonName: str
    confidence: float
    label: str


class Summary(BaseModel):
    """汇总信息"""
    totalDetections: int
    speciesCount: int
    audioDuration: str


class AnalysisData(BaseModel):
    """分析数据"""
    fileName: str
    analysisTime: float
    detections: List[Detection]
    summary: Summary


class AnalysisResponse(BaseModel):
    """分析响应"""
    success: bool
    data: Optional[AnalysisData] = None
    error: Optional[dict] = None


class ErrorResponse(BaseModel):
    """错误响应"""
    success: bool = False
    error: dict


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str
    timestamp: str
    service: str

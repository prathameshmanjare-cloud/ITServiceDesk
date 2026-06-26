from datetime import datetime, timedelta
from typing import Optional, Any

def generate_ticket_number() -> str:
    from datetime import datetime
    import random
    now = datetime.utcnow()
    yyyymm = now.strftime("%Y%m")
    xxxx = random.randint(1000, 9999)
    return f"TKT-{yyyymm}-{xxxx}"

def calculate_due_date(priority: str) -> datetime:
    now = datetime.utcnow()
    hours = {"critical": 4, "high": 8, "medium": 24, "low": 72}
    return now + timedelta(hours=hours.get(priority, 24))

def api_response(success: bool, data: Any = None, message: str = "", errors: list = None):
    return {
        "success": success,
        "data": data,
        "message": message,
        "errors": errors or []
    }

def paginated_response(items: list, total: int, page: int, page_size: int):
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size)
    }

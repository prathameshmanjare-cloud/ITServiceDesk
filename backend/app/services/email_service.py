from typing import Optional, List
from fastapi import BackgroundTasks
from app.config import settings

EMAIL_ENABLED = all([settings.SMTP_HOST, settings.SMTP_PORT, settings.SMTP_USER, settings.SMTP_PASSWORD])

async def send_email(recipients: List[str], subject: str, body_html: str, background_tasks: BackgroundTasks):
    if not EMAIL_ENABLED:
        return
    try:
        from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
        conf = ConnectionConfig(
            MAIL_USERNAME=settings.SMTP_USER,
            MAIL_PASSWORD=settings.SMTP_PASSWORD,
            MAIL_FROM=settings.SMTP_USER,
            MAIL_PORT=settings.SMTP_PORT,
            MAIL_SERVER=settings.SMTP_HOST,
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
        )
        message = MessageSchema(
            subject=subject,
            recipients=recipients,
            body=body_html,
            subtype="html",
        )
        fm = FastMail(conf)
        background_tasks.add_task(fm.send_message, message)
    except Exception as e:
        print(f"Email sending failed: {e}")

def build_ticket_email(ticket_number: str, title: str, category: str, priority: str,
                       description: str, due_date: str, link: str) -> str:
    priority_colors = {"critical": "#C62828", "high": "#F57C00", "medium": "#1976D2", "low": "#2E7D32"}
    pcolor = priority_colors.get(priority, "#1976D2")
    return f"""
    <div style="font-family: Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #F5F7FA; padding: 20px;">
        <div style="background: #1976D2; padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: white; margin: 0;">🛠 IT Service Desk</h2>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.10);">
            <h3 style="color: #1A2332;">Ticket {ticket_number}</h3>
            <p style="color: #5A6A7E;">{title}</p>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #E0E7EF; color: #5A6A7E;">Category</td><td style="padding: 8px; border-bottom: 1px solid #E0E7EF;">{category}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #E0E7EF; color: #5A6A7E;">Priority</td><td style="padding: 8px; border-bottom: 1px solid #E0E7EF;"><span style="background: {pcolor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">{priority}</span></td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #E0E7EF; color: #5A6A7E;">Due Date</td><td style="padding: 8px; border-bottom: 1px solid #E0E7EF;">{due_date}</td></tr>
                <tr><td style="padding: 8px; color: #5A6A7E; vertical-align: top;">Description</td><td style="padding: 8px;">{description[:200]}{'...' if len(description) > 200 else ''}</td></tr>
            </table>
            <a href="{link}" style="display: inline-block; margin-top: 20px; background: #1976D2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Ticket</a>
        </div>
        <div style="text-align: center; padding: 10px; color: #5A6A7E; font-size: 12px;">
            IT Service Desk Automation System
        </div>
    </div>
    """

def build_status_email(ticket_number: str, old_status: str, new_status: str,
                       note: Optional[str], link: str) -> str:
    return f"""
    <div style="font-family: Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #F5F7FA; padding: 20px;">
        <div style="background: #1976D2; padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: white; margin: 0;">🛠 IT Service Desk</h2>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <h3 style="color: #1A2332;">Status Update: {ticket_number}</h3>
            <p style="color: #5A6A7E;">Your ticket status has been updated.</p>
            <div style="text-align: center; padding: 20px;">
                <span style="background: #E0E7EF; padding: 8px 16px; border-radius: 8px;">{old_status}</span>
                <span style="font-size: 24px; padding: 0 10px;">→</span>
                <span style="background: #1976D2; color: white; padding: 8px 16px; border-radius: 8px;">{new_status}</span>
            </div>
            {f'<p style="background: #FFF3E0; padding: 12px; border-radius: 8px;"><strong>Note:</strong> {note}</p>' if note else ''}
            <a href="{link}" style="display: inline-block; margin-top: 20px; background: #1976D2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Ticket</a>
        </div>
    </div>
    """

def build_comment_email(ticket_number: str, commenter_name: str, comment_text: str, link: str) -> str:
    initial = commenter_name[0].upper() if commenter_name else "?"
    return f"""
    <div style="font-family: Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #F5F7FA; padding: 20px;">
        <div style="background: #1976D2; padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: white; margin: 0;">🛠 IT Service Desk</h2>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <h3 style="color: #1A2332;">New Comment on {ticket_number}</h3>
            <div style="display: flex; align-items: center; gap: 12px; margin: 16px 0;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #1976D2; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">{initial}</div>
                <strong>{commenter_name}</strong>
            </div>
            <p style="background: #F5F7FA; padding: 16px; border-radius: 8px; color: #1A2332;">{comment_text}</p>
            <a href="{link}" style="display: inline-block; margin-top: 20px; background: #1976D2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View & Reply</a>
        </div>
    </div>
    """

def build_sla_warning_email(ticket_number: str, title: str, due_date: str, link: str, breached: bool = False) -> str:
    border_color = "#C62828" if breached else "#F57C00"
    icon = "🚨" if breached else "⚠️"
    label = "BREACHED" if breached else "WARNING"
    return f"""
    <div style="font-family: Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #F5F7FA; padding: 20px;">
        <div style="background: #1976D2; padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: white; margin: 0;">🛠 IT Service Desk</h2>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; border-left: 4px solid {border_color};">
            <h3 style="color: #1A2332;">{icon} SLA {label}: {ticket_number}</h3>
            <p style="color: #5A6A7E;">{title}</p>
            <p style="color: {border_color}; font-weight: bold;">Due: {due_date}</p>
            <a href="{link}" style="display: inline-block; margin-top: 20px; background: #1976D2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Ticket</a>
        </div>
    </div>
    """

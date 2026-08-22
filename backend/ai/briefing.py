from datetime import datetime

def generate_briefing(twin_state: dict, language: str = "en") -> str:
    zones = twin_state.get('zones', [])
    if not zones:
        return "No simulation data available." if language == "en" else "சிமுலேஷன் தரவு எதுவும் கிடைக்கவில்லை."

    sorted_zones = sorted(zones, key=lambda z: z.get('risk_score', 0), reverse=True)
    top = sorted_zones[0] if sorted_zones else {}

    high_risk = [z for z in zones if z.get('risk_level') in ['HIGH', 'CRITICAL']]
    critical = [z for z in zones if z.get('risk_level') == 'CRITICAL']

    affected_pop = sum(z.get('population', 0) for z in high_risk) if high_risk else top.get('population', 0)
    vulnerable_pop = sum(z.get('vulnerable_population', 0) for z in high_risk) if high_risk else top.get('vulnerable_population', 0)

    severity = "CRITICAL" if critical else ("HIGH" if high_risk else "MODERATE")

    now = datetime.now().strftime("%H:%M hours")

    if language == "ta":
        # Tamil Verbal Briefing
        briefing = (
            f"அவசரநிலை கள அறிக்கை, நேரம் {now}. "
            f"சம்பவம்: நகர்ப்புற வெள்ள அபாயம். "
            f"அபாய நிலை: {severity}. "
            f"முக்கிய அபாய பகுதி: {top.get('name', 'வேளச்சேரி')}, அபாய அளவீடு {top.get('risk_score', 0):.0%} சதவீதம். "
            f"பாதிக்கப்பட்ட மக்கள் தொகை: {affected_pop:,} நபர்கள், அதில் {vulnerable_pop:,} பேர் முதியவர்கள் மற்றும் குழந்தைகள். "
            f"பரிந்துரைக்கப்பட்ட நடவடிக்கை: {top.get('name', 'வேளச்சேரி')} பகுதியிலிருந்து மக்களை உடனடியாக பாதுகாப்பான இடத்திற்கு வெளியேற்றவும். "
            f"வெள்ளம் சூழ்ந்த பகுதிகளுக்கு மீட்பு படகுகளை அனுப்பவும் மற்றும் நிவாரண முகாம்களை தயார் நிலையில் வைக்கவும். "
            f"அறிக்கை நிறைவடைந்தது."
        )
    else:
        # English Verbal Briefing
        briefing = (
            f"EMERGENCY BRIEFING BROADCAST AT {now}. "
            f"INCIDENT: Urban Flood Emergency. "
            f"SEVERITY LEVEL: {severity}. "
            f"PRIORITY ZONE: {top.get('name', 'Velachery')} with risk rating of {top.get('risk_score', 0):.0%}. "
            f"AFFECTED POPULATION: {affected_pop:,} residents, including {vulnerable_pop:,} vulnerable individuals. "
            f"RECOMMENDED ACTION: Execute immediate priority evacuation for {top.get('name', 'the critical zone')}. "
            f"Deploy rescue boats to flooded sectors and bring primary emergency shelters to full operational readiness. "
            f"End of transmission."
        )

    return briefing

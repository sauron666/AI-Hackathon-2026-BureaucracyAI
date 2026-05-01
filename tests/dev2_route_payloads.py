ANALYZE_PAYLOAD = {
    "text": (
        "Tenant shall pay a deposit equal to 6 months rent. "
        "Landlord may enter the apartment at any time without notice. "
        "Early termination by the tenant is forbidden under all circumstances."
    ),
    "document_type": "rental",
    "country": "DE",
}

CHAT_PAYLOAD = {
    "question": "How do I register my address after moving to Germany?",
    "country": "DE",
    "language": "en",
}

JOURNEY_PAYLOAD = {
    "from_country": "BR",
    "to_country": "DE",
    "nationality": "Brazilian",
    "purpose": "work",
    "language": "en",
}

COMPARE_PAYLOAD = {
    "question": "Which country is faster for a non-EU software engineer work permit?",
    "countries": ["DE", "NL", "PT", "ES"],
}

INVALID_CHAT_PAYLOAD = {
    "question": "How do I register my address after moving to Germany?",
    "country": "ZZ",
    "language": "en",
}

INVALID_ANALYZE_PAYLOAD = {
    "document_type": "rental",
    "country": "DE",
}

INVALID_JOURNEY_PAYLOAD = {
    "from_country": "BR",
    "to_country": "ZZ",
    "nationality": "Brazilian",
    "purpose": "work",
    "language": "en",
}

INVALID_COMPARE_PAYLOAD = {
    "question": "Which country is faster for a non-EU software engineer work permit?",
    "countries": ["ZZ"],
}

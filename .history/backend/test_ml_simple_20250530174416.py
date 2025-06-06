# test_ml_anonymous.py - Test pentru utilizatori anonimi și autentificați

import asyncio
import aiohttp
import json
import uuid

async def test_anonymous_user(session, base_url):
    """Test pentru utilizator anonim"""
    print("\n🕶️  Testing Anonymous User Experience...")
    print("-" * 40)
    
    # Generează un session_id pentru utilizatorul anonim
    session_id = str(uuid.uuid4())
    
    # 1. Recomandări pentru utilizator anonim (fără istoric)
    print("\n1. Getting recommendations for new anonymous user...")
    try:
        async with session.get(f"{base_url}/ml/home-recommendations", params={"limit": 5}) as response:
            result = await response.json()
            if response.status == 200:
                recs = result.get("recommendations", {})
                print(f"   ✅ Generated {len(recs.get('main_recommendations', []))} general recommendations")
                print(f"   🔍 Recommendation type: {recs.get('recommendation_type', 'unknown')}")
            else:
                print(f"   ❌ Failed: {result}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # 2. Tracking căutări pentru utilizator anonim
    print("\n2. Tracking anonymous user searches...")
    searches = [
        {"city": "Paris", "activities": ["Cultural", "Gastronomy"], "time": "2-4h"},
        {"city": "Rome", "activities": ["Cultural", "Outdoor"], "time": ">4h"},
        {"city": "Paris", "activities": ["Relaxation"], "time": "<2h"}
    ]
    
    for i, search in enumerate(searches):
        try:
            search_data = {
                "user_id": None,  # Utilizator anonim
                "session_id": session_id,
                **search
            }
            
            async with session.post(f"{base_url}/ml/track-search", json=search_data) as response:
                if response.status == 200:
                    print(f"   ✅ Search {i+1} tracked: {search['city']} - {search['activities']}")
                else:
                    result = await response.json()
                    print(f"   ❌ Search {i+1} failed: {result}")
        except Exception as e:
            print(f"   ❌ Search {i+1} error: {e}")
    
    # 3. Tracking interacțiuni pentru utilizator anonim
    print("\n3. Tracking anonymous user interactions...")
    interactions = [
        {"type": "favorite", "place": "Eiffel Tower", "place_id": "eiffel_tower", "city": "Paris"},
        {"type": "view", "place": "Louvre Museum", "place_id": "louvre", "city": "Paris"}
    ]
    
    for interaction in interactions:
        try:
            interaction_data = {
                "user_id": None,  # Utilizator anonim
                "session_id": session_id,
                "interaction_type": interaction["type"],
                "place_name": interaction["place"],
                "place_id": interaction["place_id"],
                "city": interaction["city"]
            }
            
            async with session.post(f"{base_url}/ml/track-interaction", json=interaction_data) as response:
                if response.status == 200:
                    print(f"   ✅ {interaction['type'].title()} tracked: {interaction['place']}")
                else:
                    result = await response.json()
                    print(f"   ❌ {interaction['type'].title()} failed: {result}")
        except Exception as e:
            print(f"   ❌ {interaction['type'].title()} error: {e}")
    
    # 4. Recomandări personalizate pe baza sesiunii
    print("\n4. Getting session-based recommendations...")
    try:
        params = {"session_id": session_id, "limit": 5}
        async with session.get(f"{base_url}/ml/home-recommendations", params=params) as response:
            result = await response.json()
            if response.status == 200:
                recs = result.get("recommendations", {})
                main_recs = recs.get("main_recommendations", [])
                print(f"   ✅ Generated {len(main_recs)} session-based recommendations")
                print(f"   🎯 Recommendation type: {recs.get('recommendation_type', 'unknown')}")
                print(f"   📊 Personalization level: {recs.get('personalization_level', 'none')}")
                
                if main_recs:
                    print(f"   🌟 Top recommendation: {main_recs[0]['name']} in {main_recs[0]['city']}")
                    print(f"       Reason: {main_recs[0]['recommendation_reason']}")
            else:
                print(f"   ❌ Failed: {result}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
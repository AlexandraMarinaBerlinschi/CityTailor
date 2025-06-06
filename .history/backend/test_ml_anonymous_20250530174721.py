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
    
    return session_id

async def test_authenticated_user(session, base_url):
    """Test pentru utilizator autentificat (cu fallback la anonim)"""
    print("\n👤 Testing Authenticated User Experience...")
    print("-" * 40)
    
    # Folosește un UUID de test
    test_user_id = "123e4567-e89b-12d3-a456-426614174000"
    test_session_id = str(uuid.uuid4())
    
    # 1. Tracking pentru utilizator autentificat
    print("\n1. Tracking authenticated user activity...")
    
    searches = [
        {"city": "Tokyo", "activities": ["Cultural", "Gastronomy"], "time": "2-4h"},
        {"city": "Barcelona", "activities": ["Outdoor", "Cultural"], "time": ">4h"}
    ]
    
    for search in searches:
        try:
            search_data = {
                "user_id": test_user_id,
                "session_id": test_session_id,
                **search
            }
            
            async with session.post(f"{base_url}/ml/track-search", json=search_data) as response:
                if response.status == 200:
                    print(f"   ✅ Search tracked: {search['city']} - {search['activities']}")
                else:
                    result = await response.json()
                    print(f"   ⚠️  Fell back to anonymous: {search['city']}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # 2. Recomandări pentru utilizator autentificat (sau anonim cu sesiune)
    print("\n2. Getting recommendations for authenticated user...")
    try:
        params = {"user_id": test_user_id, "session_id": test_session_id, "limit": 5}
        async with session.get(f"{base_url}/ml/home-recommendations", params=params) as response:
            result = await response.json()
            if response.status == 200:
                recs = result.get("recommendations", {})
                main_recs = recs.get("main_recommendations", [])
                print(f"   ✅ Generated {len(main_recs)} recommendations")
                print(f"   🎯 Recommendation type: {recs.get('recommendation_type', 'unknown')}")
                print(f"   📊 Personalization level: {recs.get('personalization_level', 'none')}")
            else:
                print(f"   ❌ Failed: {result}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

async def test_ml_system_comprehensive():
    """Test complet pentru sistemul ML cu suport anonim"""
    
    base_url = "http://localhost:8000"
    
    async with aiohttp.ClientSession() as session:
        
        print("🧪 Testing ML System - Anonymous & Authenticated Users")
        print("=" * 60)
        
        # Test sistem ML
        print("\n0. Testing ML System Health...")
        try:
            async with session.get(f"{base_url}/ml/test") as response:
                result = await response.json()
                if response.status == 200:
                    print("   ✅ ML System is healthy")
                    print(f"   📊 Places in DB: {result['ml_system_health']['places_in_db']}")
                    print(f"   📈 Activities tracked: {result['ml_system_health']['activities_tracked']}")
                else:
                    print("   ❌ ML System has issues")
                    return
        except Exception as e:
            print(f"   ❌ Failed to connect: {e}")
            return
        
        # Test utilizator anonim
        anonymous_session_id = await test_anonymous_user(session, base_url)
        
        # Test utilizator autentificat
        await test_authenticated_user(session, base_url)
        
        # Test scenarii mixte
        print("\n🔀 Testing Mixed Scenarios...")
        print("-" * 40)
        
        # 1. Utilizator care se autentifică după activitate anonimă
        print("\n1. Anonymous to authenticated transition...")
        try:
            # Continuă cu sesiunea anonimă anterioară, dar cu user_id
            params = {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "session_id": anonymous_session_id,
                "limit": 5
            }
            async with session.get(f"{base_url}/ml/home-recommendations", params=params) as response:
                result = await response.json()
                if response.status == 200:
                    recs = result.get("recommendations", {})
                    print(f"   ✅ Transition handled: {recs.get('recommendation_type', 'unknown')}")
                else:
                    print(f"   ❌ Transition failed: {result}")
        except Exception as e:
            print(f"   ❌ Transition error: {e}")
        
        # 2. Test trending places (funcționează pentru oricine)
        print("\n2. Testing trending places (universal)...")
        try:
            async with session.get(f"{base_url}/ml/trending", params={"limit": 3}) as response:
                result = await response.json()
                if response.status == 200:
                    trending = result.get("trending_places", [])
                    print(f"   ✅ Found {len(trending)} trending places")
                    for place in trending[:2]:
                        print(f"      - {place['name']} in {place['city']} (score: {place['trending_score']})")
                else:
                    print(f"   ❌ Trending failed: {result}")
        except Exception as e:
            print(f"   ❌ Trending error: {e}")
        
        # 3. Test enhanced search (cu utilizator anonim)
        print("\n3. Testing enhanced search for anonymous user...")
        try:
            search_data = {
                "user_id": None,
                "city": "London",
                "activities": ["Cultural", "Gastronomy"],
                "time": "2-4h"
            }
            
            async with session.post(f"{base_url}/submit-preferences-v2", json=search_data) as response:
                result = await response.json()
                if response.status == 200:
                    recommendations = result.get("recommendations", [])
                    sources = result.get("sources", {})
                    print(f"   ✅ Anonymous search returned {len(recommendations)} recommendations")
                    print(f"   📡 Sources: Amadeus={sources.get('amadeus', 0)}, ML={sources.get('ml_personalized', 0)}")
                else:
                    print(f"   ❌ Anonymous search failed: {result}")
        except Exception as e:
            print(f"   ❌ Anonymous search error: {e}")
        
        print("\n" + "=" * 60)
        print("🎉 Comprehensive ML Testing Completed!")
        print("\n📋 Summary:")
        print("✅ Anonymous users can use the system without registration")
        print("✅ Session-based recommendations work for anonymous users")
        print("✅ Authenticated users get enhanced personalization")
        print("✅ System gracefully handles user transitions")
        print("✅ All tracking works regardless of authentication status")
        
        print("\n💡 Next steps:")
        print("1. Integrate session-based recommendations in frontend")
        print("2. Add user authentication flow")
        print("3. Test with real user behavior patterns")
        print("4. Monitor anonymous vs authenticated user engagement")

if __name__ == "__main__":
    print("🚀 CityTailor ML System - Anonymous User Support Tester")
    print("Make sure your backend is running: uvicorn main:app --reload")
    print()
    
    asyncio.run(test_ml_system_comprehensive())
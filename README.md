#  CityTailor 
#  Business Requirements Document

##  Executive Summary

###  Problem Statement

Majoritatea turiștilor întâmpină dificultăți în planificarea vacanței perfecte, pierzând timp prețios în căutarea activităților potrivite și alegând adesea opțiuni generice.  
Lipsa unui sistem care să ofere recomandări personalizate și itinerarii ușor de urmărit duce la o experiență turistică inferioară.

---

###  Proposed Solution

**CityTailor** va fi aplicația care oferă turiștilor recomandări personalizate privind activitățile și posibilitatea de a-și crea itinerarii proprii.  
Soluția propusă include următoarele componente:

- **Gestionarea datelor** – utilizatorii își creează un profil cu datele de bază și preferințele personale, având ulterior posibilitatea de a salva propriile itinerarii și de a le accesa oricând.  
- **Recomandarea și colectarea simultană** – prin chestionarul interactiv și activitatea utilizatorului în aplicație, se vor recomanda locuri, evenimente etc. care pot satisface nevoile fiecărui client.

---

###  Value

Implementarea **CityTailor** va aduce următoarele beneficii:

- **Creșterea satisfacției utilizatorilor** – turiștii vor primi recomandări personalizate, adaptate intereselor lor, economisind timp și având o experiență mai plăcută, oferind astfel feedback pozitiv.  
- **Avantaj competitiv** – aplicația diferențiază platforma de ofertele generice existente pe piață, atrăgând și fidelizând utilizatorii.  
- **Decizii bazate pe date** – colectarea preferințelor și a comportamentului utilizatorilor permite îmbunătățirea continuă a serviciilor. Ulterior, pot fi integrate noi funcționalități, cum ar fi sistemele de rezervări și sugestii în timp real.

---

##  Project Objectives

Proiectul **CityTailor** urmărește să atingă obiective de business prin implementarea unei aplicații care oferă recomandări personalizate și itinerarii turistice.  
Este important să definim aceste obiective înainte de a începe în sine proiectul, pentru a putea măsura progresul și succesul proiectului.  

- Oferirea recomandărilor personalizate de activități pentru turiști, în funcție de preferințele și orașul selectat  
- Creșterea ratei de utilizatori care finalizează chestionarul de preferințe și creează itinerarii cu cel puțin **80%** în primele 3 luni de la lansare  
- Dezvoltarea funcționalităților principale *(autentificare, chestionar, recomandări, salvare itinerarii)* în cadrul resurselor și timpului alocat  
- Îmbunătățirea experienței utilizatorilor și diferențierea aplicației față de recomandările generice existente pe piață  
- Finalizarea dezvoltării și testării funcționalităților principale în termen de **6 luni**, cu lansarea oficială a aplicației la sfârșitul perioadei  

---

##  Project Scope

Prin **Project Scope** vom comunica limitele proiectului.  
Prin definirea domeniului proiectului, toți participanții rămân aliniați, iar riscul de *scope creep* (extinderea necontrolată a proiectului în afara limitelor stabilite) este redus semnificativ.  

**Timeline:**  
Dezvoltarea aplicației și testarea funcționalităților principale se va realiza în termen de 6 luni, cu lansarea oficială la finalul perioadei.  

**Budget:**  
Bugetul alocat include costurile pentru echipa de dezvoltare, infrastructura cloud *(Supabase, servere)*, design **UI/UX** și testare.  

**Deliverables:**  
- Aplicație funcțională și responsive  
- Funcționalități de autentificare, chestionar de preferințe, recomandări personalizate și gestionarea itinerariilor  
- Documentație tehnică și manual de utilizare pentru aplicație  

**Project Requirements:**  
- **Frontend:** React, interfață responsive  
- **Backend:** FastAPI, API pentru recomandări  
- **Bază de date:** Supabase pentru stocarea datelor utilizatorilor și a itinerariilor  

**Project Team:**  
Echipa va include:  
- Project Manager  
- Business Analyst  
- Developer Frontend  
- Developer Backend  
- UX/UI Designer  
- QA Tester  

##  Project Exclusions

Aceste elemente nu fac parte din livrările proiectului inițial:

- Rezervarea efectivă de bilete sau **activități externe**  
- Funcționalități offline sau **notificări push**  
- Integrarea cu alte platforme de turism pentru **rezervări automate**

---

##  Business Requirements

Vom lista acțiunile necesare pentru a atinge obiectivele proiectului.  
În funcție de complexitatea proiectului, lista poate fi scurtă sau extinsă.

| ID    | Business Requirement                      | Descriere                                                                                                                                              | Prioritate | Nivel de importanță |
|--------|-------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|-------------|----------------------|
| BR-01 | Crearea conturilor de utilizatori          | Utilizatorii își pot crea un profil cu email, parolă și preferințe.                                                                                    | 1           | Critic               |
| BR-02 | Colectarea preferințelor prin chestionar   | Sistemul colectează informații despre activitățile preferate și timpul disponibil al utilizatorului.                                                   | 1           | Critic               |
| BR-03 | Generarea recomandărilor personalizate     | Motorul de recomandări procesează datele utilizatorilor și sugerează activități relevante.                                                             | 1           | Critic               |
| BR-04 | Crearea și salvarea itinerariilor          | Utilizatorii pot salva activitățile selectate în itinerarii personalizate și le pot accesa ulterior.                                                   | 2           | Important            |
| BR-05 | Vizualizarea recomandărilor în pagina Home | Activitățile sugerate apar în pagina principală a aplicației pentru acces rapid.                                                                      | 2           | Important            |
| BR-06 | Interfață responsive                       | Aplicația este accesibilă pe desktop și mobil, cu experiență intuitivă.                                                                                | 3           | Mediu                |
| BR-07 | Colectarea și analiza datelor              | Datele privind preferințele și comportamentul utilizatorilor sunt stocate pentru optimizare și decizii bazate pe date.                                | 3           | Mediu                |

## As-Is / To-Be Analysis


| Nr. | Funcționalitate | Situația actuală (As-Is) | Situația dorită (To-Be) |
|-----|----------------|--------------------------|-------------------------|
| 1 | Planificarea vacanței | Turiștii trebuie să caute manual activități și informații pe mai multe platforme, pierzând timp și având o experiență fragmentată. | CityTailor oferă un sistem centralizat unde utilizatorii pot primi recomandări personalizate și pot planifica întreaga vacanță într-un singur loc. |
| 2 | Recomandări turistice | Recomandările existente pe site-urile de turism sunt generale, nepersonalizate și adesea irelevante pentru interesele utilizatorului. | Aplicația oferă sugestii bazate pe preferințele utilizatorului, orașul selectat și istoricul activităților, generând recomandări relevante. |
| 3 | Crearea itinerariilor | Utilizatorii trebuie să salveze manual activități și locații în documente externe (notițe, Google Maps etc.). | Utilizatorii pot adăuga activități într-un itinerar personalizat direct în aplicație, salvând și organizând toate detaliile într-un singur loc. |
| 4 | Gestionarea datelor utilizatorilor | Nu există o platformă centralizată care să colecteze preferințele și comportamentul turiștilor pentru analize ulterioare. | CityTailor colectează preferințele și comportamentul utilizatorilor pentru a îmbunătăți recomandările și pentru a oferi date utile analizelor interne. |
| 5 | Interfață utilizator | Majoritatea platformelor oferă interfețe aglomerate, dificil de folosit pe mobil. | CityTailor oferă o interfață modernă, intuitivă și responsive, adaptată tuturor dispozitivelor. |
| 6 | Feedback și îmbunătățire continuă | Feedback-ul utilizatorilor este rar colectat și nu este folosit pentru optimizarea recomandărilor. | Sistemul colectează automat feedback-ul utilizatorilor privind recomandările și îl utilizează pentru a ajusta algoritmul de recomandare. |


# CityTailor

CityTailor este o aplicație web care oferă recomandări turistice personalizate și generale. Utilizatorii pot crea itinerarii, își pot gestiona profilul și pot explora activități în funcție de preferințele lor. Administratorii au control complet asupra conținutului și utilizatorilor.

---

## User Stories

### 1. Autentificare & Profil
1. **Înregistrare utilizator**  
   - **Story:** Ca utilizator, vreau să mă pot înregistra cu un cont nou pentru a putea folosi aplicația.  
   - **Criterii de acceptanță:**  
     - Utilizatorul poate crea un cont cu email și parolă.  
     - Validarea email-ului și a parolei este activă (email valid, parolă suficient de puternică).  

2. **Autentificare utilizator**  
   - **Story:** Ca utilizator, vreau să mă pot autentifica cu email și parolă pentru a accesa funcționalitățile personalizate.  
   - **Criterii de acceptanță:**  
     - Utilizatorul se poate autentifica cu email și parolă.  
     - Datele invalide afișează un mesaj de eroare corespunzător.  

3. **Resetare parolă**  
   - **Story:** Ca utilizator, vreau să pot reseta parola dacă am uitat-o pentru a-mi recâștiga accesul.  
   - **Criterii de acceptanță:**  
     - Utilizatorul poate primi un link de resetare pe email.  
     - Utilizatorul poate seta o nouă parolă folosind linkul.  

4. **Schimbare parolă**  
   - **Story:** Ca utilizator, vreau să pot schimba parola din profil pentru a-mi menține contul securizat.  
   - **Criterii de acceptanță:**  
     - Utilizatorul poate actualiza parola după confirmarea parolei curente.  

5. **Poza de profil**  
   - **Story:** Ca utilizator, vreau să pot adăuga sau schimba poza de profil pentru ca profilul meu să fie personalizat.  
   - **Criterii de acceptanță:**  
     - Utilizatorul poate încărca o imagine.  
     - Imaginea se afișează în profil și în secțiunile relevante.  

6. **Navbar dinamic**  
   - **Story:** Ca utilizator, vreau ca bara de navigare să afișeze „Login” doar când nu sunt autentificat și „Logout” doar când sunt autentificat.  
   - **Criterii de acceptanță:**  
     - Navbar-ul se actualizează automat în funcție de starea autentificării.  

---

### 2. Recomandări
1. **Chestionar de preferințe**  
   - **Story:** Ca utilizator, vreau să completez un chestionar de preferințe turistice pentru a primi recomandări personalizate.  
   - **Criterii de acceptanță:**  
     - Chestionarul colectează preferințele relevante.  
     - Recomandările sunt filtrate pe baza răspunsurilor utilizatorului.  

2. **Recomandări generale**  
   - **Story:** Ca utilizator, vreau să văd recomandări generale/random pe pagina Home chiar dacă nu am completat chestionarul.  
   - **Criterii de acceptanță:**  
     - Pagina Home afișează activități populare sau random.  

3. **Recomandări personalizate**  
   - **Story:** Ca utilizator, vreau să văd recomandările personalizate în pagina Recommendations.  
   - **Criterii de acceptanță:**  
     - Recomandările sunt relevante pentru răspunsurile din chestionar.  
     - Recomandările sunt salvate în session storage pentru acces ulterior.  

---

### 3. Itinerariu
1. **Adăugare activități în itinerariu**  
   - **Story:** Ca utilizator autentificat, vreau să pot adăuga activități în itinerariul meu pentru a-mi organiza excursiile.  
   - **Criterii de acceptanță:**  
     - Utilizatorii pot selecta activități și le pot adăuga în itinerariul personal.  

2. **Itinerariu organizat pe orașe**  
   - **Story:** Ca utilizator, vreau să văd itinerariile grupate pe orașe pentru o mai bună organizare.  
   - **Criterii de acceptanță:**  
     - Activitățile sunt afișate grupate pe oraș în pagina My Itinerary.  

3. **Afișare itinerariu**  
   - **Story:** Ca utilizator, vreau ca pagina My Itinerary să afișeze doar carduri cu nume, poză, rating și descriere, fără hartă.  
   - **Criterii de acceptanță:**  
     - Cardurile sunt afișate clar și consistent.  
     - Nu se afișează hartă pe pagină.  

---

### 4. Admin
1. **Gestionare activități**  
   - **Story:** Ca admin, vreau să am control complet CRUD asupra activităților pentru a putea gestiona conținutul aplicației.  
   - **Criterii de acceptanță:**  
     - Adminul poate crea, citi, actualiza și șterge activități.  

2. **Gestionare utilizatori**  
   - **Story:** Ca admin, vreau să pot gestiona utilizatorii pentru a putea bloca sau edita conturi.  
   - **Criterii de acceptanță:**  
     - Adminul poate vizualiza, edita sau bloca conturile utilizatorilor.  

---

### 5. Alte funcționalități
1. **Redirecționare automată la Home**  
   - **Story:** Ca utilizator, vreau să fiu redirecționat automat către pagina Home pentru o navigare intuitivă.  
   - **Criterii de acceptanță:**  
     - Ruta implicită trimite utilizatorul la pagina Home.  

2. **Interfață în limba engleză**  
   - **Story:** Ca utilizator, vreau ca aplicația să fie în limba engleză pentru a fi accesibilă internațional.  
   - **Criterii de acceptanță:**  
     - Toate elementele UI, butoanele și mesajele sunt în limba engleză.  

---

## Note
- Recomandările personalizate sunt generate pe baza chestionarului și salvate în session storage pentru continuitate.  
- Doar utilizatorii autentificați pot adăuga activități în itinerarii.  
- Administratorii au acces complet la conținut și gestionarea utilizatorilor.  


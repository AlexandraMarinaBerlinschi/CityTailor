<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resetare Parolă</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            min-height: 100vh;
        }

        .container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            padding: 2rem;
            width: 100%;
            max-width: 400px;
        }

        .title {
            font-size: 1.5rem;
            font-weight: 700;
            text-align: center;
            margin-bottom: 1.5rem;
            color: #1f2937;
        }

        .success-title {
            color: #059669;
        }

        .form-group {
            position: relative;
            margin-bottom: 1rem;
        }

        .input {
            width: 100%;
            padding: 0.75rem;
            padding-right: 2.5rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .eye-button {
            position: absolute;
            right: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            color: #6b7280;
            padding: 0.25rem;
            border-radius: 4px;
            transition: color 0.2s;
        }

        .eye-button:hover {
            color: #374151;
        }

        .error-message {
            color: #dc2626;
            font-size: 0.875rem;
            text-align: center;
            margin-bottom: 1rem;
            padding: 0.5rem;
            background-color: #fef2f2;
            border-radius: 6px;
            border: 1px solid #fecaca;
        }

        .button {
            width: 100%;
            background-color: #3b82f6;
            color: white;
            padding: 0.75rem 1rem;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.1s;
        }

        .button:hover {
            background-color: #2563eb;
        }

        .button:active {
            transform: translateY(1px);
        }

        .button:disabled {
            background-color: #9ca3af;
            cursor: not-allowed;
            transform: none;
        }

        .text-center {
            text-align: center;
        }

        .text-red {
            color: #dc2626;
        }

        .text-gray {
            color: #6b7280;
        }

        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #ffffff;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s ease-in-out infinite;
            margin-right: 0.5rem;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .success-icon {
            font-size: 3rem;
            color: #059669;
            margin-bottom: 1rem;
        }

        .password-requirements {
            font-size: 0.875rem;
            color: #6b7280;
            margin-bottom: 1rem;
            padding: 0.75rem;
            background-color: #f9fafb;
            border-radius: 6px;
            border-left: 4px solid #3b82f6;
        }

        .requirement {
            margin-bottom: 0.25rem;
        }

        .requirement.valid {
            color: #059669;
        }

        .requirement.invalid {
            color: #dc2626;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div id="verifying-step" class="text-center" style="display: none;">
                <div class="spinner"></div>
                <span>Se verifică linkul...</span>
            </div>

            <div id="invalid-step" class="text-center text-red" style="display: none;">
                <h2 class="title">Link invalid sau expirat</h2>
                <p>Linkul de resetare a parolei nu este valid sau a expirat.</p>
                <button class="button" onclick="goToLogin()" style="margin-top: 1rem;">
                    Înapoi la Login
                </button>
            </div>

            <div id="success-step" class="text-center" style="display: none;">
                <div class="success-icon">✓</div>
                <h2 class="title success-title">Parola a fost actualizată cu succes!</h2>
                <button class="button" onclick="goToLogin()" style="margin-top: 1rem;">
                    Mergi la Login
                </button>
            </div>

            <div id="enter-password-step" style="display: none;">
                <h2 class="title">Setează o parolă nouă</h2>
                
                <div class="password-requirements">
                    <div class="requirement" id="req-length">• Minimum 8 caractere</div>
                    <div class="requirement" id="req-uppercase">• Cel puțin o literă mare</div>
                    <div class="requirement" id="req-lowercase">• Cel puțin o literă mică</div>
                    <div class="requirement" id="req-number">• Cel puțin o cifră</div>
                </div>

                <form onsubmit="handleUpdatePassword(event)">
                    <div class="form-group">
                        <input 
                            type="password" 
                            id="new-password"
                            placeholder="Parola nouă"
                            class="input"
                            required
                            oninput="validatePassword()"
                        />
                        <button type="button" class="eye-button" onclick="togglePasswordVisibility()">
                            <svg id="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <svg id="eye-off-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                        </button>
                    </div>

                    <div id="error-message" class="error-message" style="display: none;"></div>

                    <button type="submit" class="button" id="update-button" disabled>
                        <span id="button-text">Actualizează parola</span>
                        <span id="button-loading" style="display: none;">
                            <span class="spinner"></span>
                            Se actualizează...
                        </span>
                    </button>
                </form>
            </div>
        </div>
    </div>

    <script>
        let currentStep = 'verifying';
        let showPassword = false;

        // Simulare verificare link la încărcare
        window.onload = function() {
            // Afișează step-ul de verificare
            showStep('verifying');
            
            // Simulează verificarea linkului
            setTimeout(() => {
                // Verifică parametrii URL
                const urlParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                
                const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
                const type = urlParams.get('type') || hashParams.get('type');
                
                if (type === 'recovery' && accessToken) {
                    // Link valid - afișează formularul
                    showStep('enter-password');
                } else {
                    // Link invalid
                    showStep('invalid');
                }
            }, 1500);
        };

        function showStep(step) {
            // Ascunde toate step-urile
            document.getElementById('verifying-step').style.display = 'none';
            document.getElementById('invalid-step').style.display = 'none';
            document.getElementById('success-step').style.display = 'none';
            document.getElementById('enter-password-step').style.display = 'none';
            
            // Afișează step-ul curent
            document.getElementById(step + '-step').style.display = 'block';
            currentStep = step;
        }

        function togglePasswordVisibility() {
            const passwordInput = document.getElementById('new-password');
            const eyeIcon = document.getElementById('eye-icon');
            const eyeOffIcon = document.getElementById('eye-off-icon');
            
            showPassword = !showPassword;
            
            if (showPassword) {
                passwordInput.type = 'text';
                eyeIcon.style.display = 'none';
                eyeOffIcon.style.display = 'block';
            } else {
                passwordInput.type = 'password';
                eyeIcon.style.display = 'block';
                eyeOffIcon.style.display = 'none';
            }
        }

        function validatePassword() {
            const password = document.getElementById('new-password').value;
            const button = document.getElementById('update-button');
            
            // Verifică cerințele
            const hasLength = password.length >= 8;
            const hasUppercase = /[A-Z]/.test(password);
            const hasLowercase = /[a-z]/.test(password);
            const hasNumber = /\d/.test(password);
            
            // Actualizează vizual cerințele
            updateRequirement('req-length', hasLength);
            updateRequirement('req-uppercase', hasUppercase);
            updateRequirement('req-lowercase', hasLowercase);
            updateRequirement('req-number', hasNumber);
            
            // Activează/dezactivează butonul
            const allValid = hasLength && hasUppercase && hasLowercase && hasNumber;
            button.disabled = !allValid;
        }

        function updateRequirement(id, isValid) {
            const element = document.getElementById(id);
            element.className = 'requirement ' + (isValid ? 'valid' : 'invalid');
        }

        function showError(message) {
            const errorDiv = document.getElementById('error-message');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }

        function hideError() {
            document.getElementById('error-message').style.display = 'none';
        }

        function setLoading(loading) {
            const button = document.getElementById('update-button');
            const buttonText = document.getElementById('button-text');
            const buttonLoading = document.getElementById('button-loading');
            
            if (loading) {
                button.disabled = true;
                buttonText.style.display = 'none';
                buttonLoading.style.display = 'inline-flex';
            } else {
                button.disabled = false;
                buttonText.style.display = 'inline';
                buttonLoading.style.display = 'none';
            }
        }

        async function handleUpdatePassword(event) {
            event.preventDefault();
            
            hideError();
            setLoading(true);
            
            const password = document.getElementById('new-password').value;
            
            // Simulează actualizarea parolei
            setTimeout(() => {
                setLoading(false);
                
                // Simulează diferite scenarii
                const random = Math.random();
                
                if (random < 0.1) {
                    // 10% șanse să fie aceeași parolă
                    showError('Nu poți reutiliza o parolă veche.');
                } else if (random < 0.2) {
                    // 10% șanse eroare generică
                    showError('Ceva nu a mers bine. Încearcă din nou.');
                } else {
                    // 80% șanse succes
                    showStep('success');
                }
            }, 2000);
        }

        function goToLogin() {
            // În aplicația reală, aceasta ar naviga la pagina de login
            alert('Navigare la pagina de login...');
            // window.location.href = '/login';
        }
    </script>
</body>
</html>
document.addEventListener('DOMContentLoaded', () => {
    // ... existing variables ...
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const promptInput = document.getElementById('promptInput');
    const transformButton = document.getElementById('transformButton');
    const buttonText = transformButton.querySelector('.button-text');
    const spinner = transformButton.querySelector('.spinner');
    const statusMessage = document.getElementById('statusMessage');
    const resultSection = document.querySelector('.result-section');
    const resultImage = document.getElementById('resultImage');
    const downloadLink = document.getElementById('downloadLink');
    const editGeneratedImageButton = document.getElementById('editGeneratedImageButton');

    const takePhotoButton = document.getElementById('takePhotoButton');
    const cameraModal = document.getElementById('cameraModal');
    const cameraFeed = document.getElementById('cameraFeed');
    const photoCanvas = document.getElementById('photoCanvas');
    const snapPhotoButton = document.getElementById('snapPhotoButton');
    const cancelCameraButton = document.getElementById('cancelCameraButton');
    const closeCameraModalButton = document.getElementById('closeCameraModal');

    const modeEditRadio = document.getElementById('modeEdit');
    const modeCreateRadio = document.getElementById('modeCreate');
    const generationModeRadios = document.querySelectorAll('input[name="generationMode"]');
    const imageQualityRadios = document.querySelectorAll('input[name="imageQuality"]');
    const uploadSectionContainer = document.getElementById('uploadSectionContainer');
    const instructionsTitle = document.getElementById('instructionsTitle');
    const qualityStepNumber = document.getElementById('qualityStepNumber');
    const creativeCornerDiv = document.getElementById('creativeCorner');
    const creativeThoughtP = document.getElementById('creativeThought');

    const outputWidthInput = document.getElementById('outputWidth');
    const outputHeightInput = document.getElementById('outputHeight');

    const miniGameContainer = document.getElementById('miniGameContainer');
    const gameArea = document.getElementById('gameArea');
    const gameScoreDisplay = document.getElementById('gameScore');
    const gameLivesDisplay = document.getElementById('gameLives');
    
    // --- Space Shooter Game Variables ---
    let gameCanvas = null;
    let gameCtx = null;
    let player = {};
    let bullets = [];
    let enemies = [];
    let currentScore = 0; 
    let gameRunning = false;
    let animationFrameId = null;
    let enemySpawnTimer = 0;
    const ENEMY_SPAWN_INTERVAL = 120; 
    const PLAYER_SIZE = 30; 
    const ENEMY_SIZE = 28;
    const BULLET_SIZE = 15;
    const PLAYER_EMOJI = '🚀';
    const ENEMY_EMOJI = '👾';
    const BULLET_EMOJI = '✨';
    let playerLives = 3; 
    let isShooting = false; 
    const BULLET_COOLDOWN = 10; 
    let framesSinceLastShot = 0; 
    let gameOverDisplayed = false; 
    // --- End Space Shooter Game Variables ---


    let currentResizedImagePreviewDataUrl = null;
    let uploadedFileUrl = null;
    let cameraStream = null;
    let currentMode = 'edit';

    const MAX_IMAGE_DIMENSION = 512;
    const DEFAULT_OUTPUT_DIMENSION = 512;
    const TMPFILES_API_URL = 'https://tmpfiles.org/api/v1/upload';

    // ... existing event listeners ...
    imageUpload.addEventListener('change', handleFileSelect);
    takePhotoButton.addEventListener('click', openCamera);
    closeCameraModalButton.addEventListener('click', closeCamera);
    cancelCameraButton.addEventListener('click', closeCamera);
    snapPhotoButton.addEventListener('click', snapPhoto);
    promptInput.addEventListener('input', checkFormValidity);
    transformButton.addEventListener('click', handleTransform);
    editGeneratedImageButton.addEventListener('click', handleEditGeneratedImage);

    generationModeRadios.forEach(radio => radio.addEventListener('change', handleModeChange));
    imageQualityRadios.forEach(radio => radio.addEventListener('change', checkFormValidity));


    updateUIVisibility();
    checkFormValidity();

    // ... existing functions: getImageDimensions, handleModeChange, updateUIVisibility, checkFormValidity ...
    // ... dataURLtoFile, uploadToTmpFiles, processImageInput, handleFileSelect, resizeImage ...
    // ... openCamera, closeCamera, snapPhoto, blobUrlToDataUrl, handleEditGeneratedImage ...
    
    function getImageDimensions(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
            };
            img.onerror = (err) => {
                console.error("Error loading image to get dimensions:", err);
                reject(new Error("Could not get image dimensions."));
            };
            img.src = dataUrl;
        });
    }

    async function handleModeChange(event) {
        currentMode = event.target.value;
        await updateUIVisibility();
        if (currentMode === 'create') {
            currentResizedImagePreviewDataUrl = null;
            uploadedFileUrl = null;
            imagePreview.src = '#';
            imagePreview.style.display = 'none';
            previewPlaceholder.textContent = 'Image preview will appear here';
            previewPlaceholder.style.display = 'block';
            imageUpload.value = '';
            outputWidthInput.value = DEFAULT_OUTPUT_DIMENSION;
            outputHeightInput.value = DEFAULT_OUTPUT_DIMENSION;
        } else {
            if (currentResizedImagePreviewDataUrl) {
                try {
                    const dims = await getImageDimensions(currentResizedImagePreviewDataUrl);
                    outputWidthInput.value = dims.width;
                    outputHeightInput.value = dims.height;
                } catch (e) {
                    console.warn("Could not set dimensions from existing preview on mode change:", e);
                    outputWidthInput.value = DEFAULT_OUTPUT_DIMENSION;
                    outputHeightInput.value = DEFAULT_OUTPUT_DIMENSION;
                }
            } else {
                outputWidthInput.value = DEFAULT_OUTPUT_DIMENSION;
                outputHeightInput.value = DEFAULT_OUTPUT_DIMENSION;
            }
        }
        checkFormValidity();
    }

    async function updateUIVisibility() {
        if (currentMode === 'edit') {
            uploadSectionContainer.style.display = 'block';
            instructionsTitle.textContent = '2. Describe Transformation';
            qualityStepNumber.textContent = '3';
            promptInput.placeholder = "e.g., 'make this a vibrant oil painting', 'add a dragon flying in the sky'";
            if (currentResizedImagePreviewDataUrl) {
                try {
                    const dims = await getImageDimensions(currentResizedImagePreviewDataUrl);
                    outputWidthInput.value = dims.width;
                    outputHeightInput.value = dims.height;
                } catch (e) {
                    outputWidthInput.value = DEFAULT_OUTPUT_DIMENSION;
                    outputHeightInput.value = DEFAULT_OUTPUT_DIMENSION;
                }
            } else {
                outputWidthInput.value = DEFAULT_OUTPUT_DIMENSION;
                outputHeightInput.value = DEFAULT_OUTPUT_DIMENSION;
            }
        } else {
            uploadSectionContainer.style.display = 'none';
            instructionsTitle.textContent = '1. Describe Your Vision';
            qualityStepNumber.textContent = '2';
            promptInput.placeholder = "e.g., 'a majestic lion in a surreal landscape', 'a futuristic city at sunset'";
            outputWidthInput.value = DEFAULT_OUTPUT_DIMENSION;
            outputHeightInput.value = DEFAULT_OUTPUT_DIMENSION;
        }
        if (miniGameContainer.style.display !== 'none' && gameRunning) {
            endMiniGame();
        }
    }

    function checkFormValidity() {
        const promptFilled = promptInput.value.trim() !== '';
        if (currentMode === 'edit') {
            transformButton.disabled = !(uploadedFileUrl && promptFilled);
        } else {
            transformButton.disabled = !promptFilled;
        }
    }

    function dataURLtoFile(dataurl, filename) {
        let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, {type:mime});
    }

    async function uploadToTmpFiles(fileObject) {
        setStatus('Uploading image for processing...', false);
        const formData = new FormData();
        formData.append('file', fileObject);

        try {
            const response = await fetch(TMPFILES_API_URL, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            if (response.ok && data.status === 'success' && data.data && data.data.url) {
                const viewerUrl = data.data.url;
                const urlObj = new URL(viewerUrl);
                const pathSegments = urlObj.pathname.split('/');
                const fileId = pathSegments[1];
                const fileName = pathSegments[2];
                const directDownloadUrl = `https://tmpfiles.org/dl/${fileId}/${fileName}${urlObj.search}${urlObj.hash}`;
                
                setStatus('Image ready for transformation!', false, true);
                return directDownloadUrl;
            } else {
                const errorMessage = `tmpfiles.org error: ${data.message || JSON.stringify(data) || response.statusText}.`;
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Error uploading to tmpfiles.org:', error);
            throw error;
        }
    }

    async function processImageInput(imageDataUrl, sourceDescription = "image") {
        currentResizedImagePreviewDataUrl = null;
        uploadedFileUrl = null;
        checkFormValidity(); 

        setStatus(`Processing ${sourceDescription}...`, false);
        imagePreview.style.display = 'none';
        previewPlaceholder.style.display = 'block';
        previewPlaceholder.textContent = `Resizing ${sourceDescription}...`;
        resultSection.style.display = 'none'; 

        try {
            const resizedDataUrl = await new Promise((resolve, reject) => {
                resizeImage(imageDataUrl, MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, resolve, reject);
            });

            currentResizedImagePreviewDataUrl = resizedDataUrl;
            imagePreview.src = currentResizedImagePreviewDataUrl;
            imagePreview.style.display = 'block';
            previewPlaceholder.style.display = 'none';
            
            try {
                const dims = await getImageDimensions(currentResizedImagePreviewDataUrl);
                outputWidthInput.value = dims.width;
                outputHeightInput.value = dims.height;
            } catch (dimError) {
                console.warn("Could not auto-set dimensions from new preview:", dimError);
                outputWidthInput.value = DEFAULT_OUTPUT_DIMENSION; 
                outputHeightInput.value = DEFAULT_OUTPUT_DIMENSION;
            }

            const imageFile = dataURLtoFile(resizedDataUrl, `uploaded_${Date.now()}.jpg`);
            uploadedFileUrl = await uploadToTmpFiles(imageFile);
            checkFormValidity();

        } catch (error) {
            setStatus(`Error preparing ${sourceDescription}: ${error.message}`, true);
            currentResizedImagePreviewDataUrl = null;
            uploadedFileUrl = null;
            imagePreview.style.display = 'none';
            previewPlaceholder.textContent = 'Image preview will appear here';
            previewPlaceholder.style.display = 'block';
            checkFormValidity();
        }
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setStatus('Please upload a valid image file.', true);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                processImageInput(e.target.result, "chosen image");
            };
            reader.onerror = () => {
                 setStatus('Error reading file.', true);
            };
            reader.readAsDataURL(file);
        }
    }

    function resizeImage(dataUrl, maxWidth, maxHeight, callback, errorCallback) {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            let outputFormat = 'image/jpeg'; 
            callback(canvas.toDataURL(outputFormat, 0.9)); 
        };
        img.onerror = () => {
            console.error('Error loading image for resizing.');
            if (errorCallback) errorCallback(new Error('Error loading image for resizing.'));
            else setStatus('Error loading image for resizing.', true);
        };
        img.src = dataUrl;
    }

    async function openCamera() {
        if (currentMode !== 'edit') {
            setStatus('Camera can only be used in "Edit Existing Image" mode.', true);
            return;
        }
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        cameraModal.style.display = 'flex';
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            cameraFeed.srcObject = cameraStream;
            cameraFeed.onloadedmetadata = () => {
                 cameraFeed.play();
            };
            setStatus('Camera active. Point and snap!', false);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setStatus(`Camera error: ${err.message}. Ensure permission is granted.`, true);
            cameraModal.style.display = 'none';
        }
    }

    function closeCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        cameraFeed.srcObject = null;
        cameraModal.style.display = 'none';
        setStatus('');
    }

    function snapPhoto() {
        if (!cameraStream || !cameraFeed.videoWidth) {
             setStatus('Camera not ready or photo already snapped.', true);
             return;
        }
        const context = photoCanvas.getContext('2d');
        photoCanvas.width = cameraFeed.videoWidth;
        photoCanvas.height = cameraFeed.videoHeight;
        context.drawImage(cameraFeed, 0, 0, photoCanvas.width, photoCanvas.height);
        
        const capturedDataUrl = photoCanvas.toDataURL('image/jpeg', 0.9);
        closeCamera();
        processImageInput(capturedDataUrl, "captured photo");
    }

    async function blobUrlToDataUrl(blobUrl) {
        try {
            const response = await fetch(blobUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = (error) => reject(new Error(`FileReader error: ${error.message}`));
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error("Error converting blob URL to Data URL:", error);
            throw error;
        }
    }

    async function handleEditGeneratedImage() {
        if (!resultImage.src || resultImage.src === '#' || resultImage.src.startsWith('http://localhost')) {
            setStatus('No generated image to edit.', true);
            return;
        }

        setStatus('Preparing your creation for further editing...', false);
        editGeneratedImageButton.disabled = true;

        try {
            if (currentMode !== 'edit') {
                currentMode = 'edit';
                modeEditRadio.checked = true;
                await updateUIVisibility(); 
            }

            const imageDataUrl = await blobUrlToDataUrl(resultImage.src);
            await processImageInput(imageDataUrl, "your previous creation"); 
            
            resultSection.style.display = 'none';
            downloadLink.style.display = 'none';
            editGeneratedImageButton.style.display = 'none';
            
            promptInput.value = ''; 
            promptInput.focus();
            setStatus('Image ready for new transformation. Describe what you want next!', false, true);
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            setStatus(`Error preparing image for editing: ${error.message}`, true);
            console.error("Error in handleEditGeneratedImage:", error);
        } finally {
            editGeneratedImageButton.disabled = false;
        }
    }

    // --- Start Space Shooter Game Logic ---
    function initGameSpecifics() {
        player = {
            x: gameCanvas.width / 2 - PLAYER_SIZE / 2,
            y: gameCanvas.height - PLAYER_SIZE - 10,
            width: PLAYER_SIZE,
            height: PLAYER_SIZE,
            speed: 8 
        };
        bullets = [];
        enemies = [];
        enemySpawnTimer = 0;
        currentScore = 0;
        gameScoreDisplay.textContent = currentScore;
        playerLives = 3; 
        gameLivesDisplay.textContent = playerLives; 
        isShooting = false;
        framesSinceLastShot = BULLET_COOLDOWN; 
        gameOverDisplayed = false;
        
        // Clear any old game over message if reusing gameArea
        const existingGameOverMsg = gameArea.querySelector('.game-over-text');
        if (existingGameOverMsg) {
            existingGameOverMsg.remove();
        }
    }

    function handlePlayerMove(event) {
        if (!gameRunning || !gameCanvas) return;
        const rect = gameCanvas.getBoundingClientRect();
        const newX = event.clientX - rect.left - player.width / 2;
        player.x = Math.max(0, Math.min(gameCanvas.width - player.width, newX));
    }

    function handlePlayerTouchMove(event) {
        if (!gameRunning || !gameCanvas || event.touches.length === 0) return;
        event.preventDefault(); 
        const rect = gameCanvas.getBoundingClientRect();
        const touch = event.touches[0];
        const newX = touch.clientX - rect.left - player.width / 2;
        player.x = Math.max(0, Math.min(gameCanvas.width - player.width, newX));
    }
    
    function handleShootStart(event) { 
        if (!gameRunning) return;
        event.preventDefault(); 
        isShooting = true;
        // Optionally, shoot one bullet immediately on press
        if (framesSinceLastShot >= BULLET_COOLDOWN) {
            shootBullet();
            framesSinceLastShot = 0;
        }
    }

    function handleShootEnd() { 
        isShooting = false;
    }

    function shootBullet() {
        bullets.push({
            x: player.x + player.width / 2 - BULLET_SIZE / 2, 
            y: player.y,
            width: BULLET_SIZE,
            height: BULLET_SIZE * 1.5, 
            speed: 7
        });
    }

    function updatePlayer() {
        // Player position updated by event handlers
        if (isShooting && framesSinceLastShot >= BULLET_COOLDOWN) {
            shootBullet();
            framesSinceLastShot = 0;
        }
        framesSinceLastShot++;
    }

    function drawPlayer() {
        if (!gameCtx) return;
        gameCtx.font = `${PLAYER_SIZE}px Arial`;
        gameCtx.textAlign = "center";
        gameCtx.textBaseline = "middle";
        gameCtx.fillText(PLAYER_EMOJI, player.x + player.width / 2, player.y + player.height / 2);
    }

    function updateBullets() {
        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].y -= bullets[i].speed;
            if (bullets[i].y + bullets[i].height < 0) {
                bullets.splice(i, 1);
            }
        }
    }

    function drawBullets() {
        if (!gameCtx) return;
        gameCtx.font = `${BULLET_SIZE}px Arial`;
        gameCtx.textAlign = "center";
        gameCtx.textBaseline = "middle";
        bullets.forEach(bullet => {
            gameCtx.fillText(BULLET_EMOJI, bullet.x + bullet.width/2, bullet.y + bullet.height/2);
        });
    }

    function spawnEnemy() {
        enemySpawnTimer++;
        if (enemySpawnTimer >= ENEMY_SPAWN_INTERVAL) {
            enemySpawnTimer = 0;
            const x = Math.random() * (gameCanvas.width - ENEMY_SIZE);
            enemies.push({
                x: x,
                y: 0 - ENEMY_SIZE, 
                width: ENEMY_SIZE,
                height: ENEMY_SIZE,
                speed: 1 + Math.random() * 2 
            });
        }
    }

    function updateEnemies() {
        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].y += enemies[i].speed;
            if (enemies[i].y > gameCanvas.height) { 
                enemies.splice(i, 1);
                playerLives--;
                updateLivesDisplay();
                if (playerLives <= 0 && gameRunning) {
                    gameOver(); 
                }
            }
        }
    }

    function drawEnemies() {
        if (!gameCtx) return;
        gameCtx.font = `${ENEMY_SIZE}px Arial`;
        gameCtx.textAlign = "center";
        gameCtx.textBaseline = "middle";
        enemies.forEach(enemy => {
           gameCtx.fillText(ENEMY_EMOJI, enemy.x + enemy.width/2, enemy.y + enemy.height/2);
        });
    }

    function checkCollisions() {
        if (!gameRunning) return; 

        // Bullets vs Enemies
        for (let i = bullets.length - 1; i >= 0; i--) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                if (bullets[i] && enemies[j] &&
                    bullets[i].x < enemies[j].x + enemies[j].width &&
                    bullets[i].x + bullets[i].width > enemies[j].x &&
                    bullets[i].y < enemies[j].y + enemies[j].height &&
                    bullets[i].y + bullets[i].height > enemies[j].y) {
                    
                    bullets.splice(i, 1);
                    enemies.splice(j, 1);
                    currentScore += 10;
                    gameScoreDisplay.textContent = currentScore;
                    // Add sound effect for enemy hit (optional)
                    // playSound('enemyHit'); 
                    break; 
                }
            }
        }

        // Enemies vs Player
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (player.x < enemies[i].x + enemies[i].width &&
                player.x + player.width > enemies[i].x &&
                player.y < enemies[i].y + enemies[i].height &&
                player.y + player.height > enemies[i].y) {
                
                enemies.splice(i, 1); 
                playerLives--;
                updateLivesDisplay();
                // Add sound effect for player hit (optional)
                // playSound('playerHit');

                if (playerLives <= 0 && gameRunning) {
                    gameOver();
                }
                return; 
            }
        }
    }
    
    function updateLivesDisplay() {
        gameLivesDisplay.textContent = playerLives;
    }
    
    function gameOver() {
        if (!gameRunning) return; 
        gameRunning = false; 
        isShooting = false; 
        // Don't cancel animation frame here, let it run one more time to draw game over message
        // if (animationFrameId) cancelAnimationFrame(animationFrameId);

        console.log("Game Over! Final Score:", currentScore);
        gameOverDisplayed = true; 
        // No automatic call to endMiniGame() here, let the main process handle it
        // or player can just see the game over screen until image is generated.
    }


    function gameLoop() {
        if (!gameCtx || !gameCanvas) return; 

        if (!gameRunning) {
            if (gameOverDisplayed) { 
                gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
                drawPlayer(); 
                drawBullets(); 
                drawEnemies(); 

                gameCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
                gameCtx.fillRect(0, gameCanvas.height / 2 - 40, gameCanvas.width, 80);
                
                gameCtx.font = "bold 24px Arial";
                gameCtx.fillStyle = "white";
                gameCtx.textAlign = "center";
                gameCtx.fillText("GAME OVER!", gameCanvas.width / 2, gameCanvas.height / 2 - 10);
                gameCtx.font = "18px Arial";
                gameCtx.fillText("Final Score: " + currentScore, gameCanvas.width / 2, gameCanvas.height / 2 + 20);
            }
             // If !gameRunning and not gameOverDisplayed, it means game hasn't started or was properly ended.
            return; 
        }
        
        gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        updatePlayer();
        updateBullets();
        spawnEnemy();
        updateEnemies();
        
        drawPlayer();
        drawBullets();
        drawEnemies();
        
        checkCollisions(); 

        // Request next frame only if game is still supposed to be running
        // This check is important because checkCollisions might have set gameRunning to false
        if (gameRunning) { 
            animationFrameId = requestAnimationFrame(gameLoop);
        } else if (gameOverDisplayed) {
            // If game over was triggered in this loop, request one more frame to draw the message
            requestAnimationFrame(gameLoop); 
        }
    }

    function startMiniGame() {
        if (gameRunning && !gameOverDisplayed) endMiniGame(); 

        gameRunning = true;
        gameOverDisplayed = false; 
        // currentScore and playerLives are reset in initGameSpecifics
        miniGameContainer.style.display = 'block';
        creativeCornerDiv.style.display = 'none'; 
        
        if (!gameCanvas) { 
            gameArea.innerHTML = ''; 
            gameCanvas = document.createElement('canvas');
            gameCanvas.id = 'gameCanvas'; 
            gameArea.appendChild(gameCanvas);

            try {
                gameCanvas.width = gameArea.clientWidth;
                gameCanvas.height = gameArea.clientHeight;
                gameCtx = gameCanvas.getContext('2d');
            } catch (e) {
                console.error("Error setting up game canvas:", e);
                setStatus("Could not start mini-game.", true);
                gameRunning = false;
                miniGameContainer.style.display = 'none';
                return;
            }
            // Add event listeners only once when canvas is created
            gameCanvas.addEventListener('mousemove', handlePlayerMove);
            gameCanvas.addEventListener('mousedown', handleShootStart);
            gameCanvas.addEventListener('touchmove', handlePlayerTouchMove, { passive: false }); 
            gameCanvas.addEventListener('touchstart', handleShootStart, { passive: false });
            
            // Listen for mouseup/touchend on the window to ensure shooting stops
            // even if the pointer is released outside the canvas.
            window.addEventListener('mouseup', handleShootEnd);
            window.addEventListener('touchend', handleShootEnd);

        } else {
             // If canvas exists, just clear it and ensure context is still valid
            gameCtx.clearRect(0,0, gameCanvas.width, gameCanvas.height);
        }


        initGameSpecifics(); 

        if (animationFrameId) cancelAnimationFrame(animationFrameId); 
        gameLoop();
    }

    function endMiniGame() {
        gameRunning = false;
        isShooting = false; 

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Don't remove listeners from window here as they are general.
        // Canvas specific listeners are added once.
        // If you were dynamically adding/removing listeners to gameCanvas per game, you'd remove them.

        miniGameContainer.style.display = 'none';
        if (gameArea && gameCanvas) { 
             gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
             // Optionally, remove the canvas if you want it recreated next time,
             // or keep it to avoid re-adding event listeners.
             // For now, let's keep it to avoid re-adding listeners.
             // gameArea.innerHTML = ''; gameCanvas = null; gameCtx = null;
        }
         // No need to set gameCanvas = null if we keep it.
    }
    // --- End Space Shooter Game Logic ---


    async function showCreativeThought() {
        if (gameRunning) { 
            creativeCornerDiv.style.display = 'none';
            return;
        }
        creativeCornerDiv.style.display = 'block';
        creativeThoughtP.textContent = 'Brewing up some brilliance... ';
        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a cheerful assistant. Briefly offer a single, witty, or inspiring thought about art, creativity, or technology while the user waits for an image to generate. Keep it under 25 words. Be fun and engaging!" },
                    { role: "user", content: "Give me a fun waiting message for image generation." }
                ]
            });
            creativeThoughtP.textContent = completion.content || "Keep those creative juices flowing!";
        } catch (error) {
            console.error("Error fetching creative thought:", error);
            creativeThoughtP.textContent = "Imagination is sparking... just a moment more!";
        }
    }

    async function handleTransform() {
        const promptValue = promptInput.value.trim();
        if (currentMode === 'edit' && !uploadedFileUrl) {
            setStatus('Please upload an image for editing mode.', true);
            return;
        }
        if (!promptValue) {
            setStatus('Please provide instructions or a description.', true);
            return;
        }

        setLoadingState(true);
        setStatus('Summoning AI creativity... this may take a moment.', false);
        resultSection.style.display = 'none';
        resultImage.src = '#'; 
        downloadLink.style.display = 'none';
        editGeneratedImageButton.style.display = 'none';
        
        startMiniGame(); 
        const selectedQuality = document.querySelector('input[name="imageQuality"]:checked').value;
        
        let outputWidth = parseInt(outputWidthInput.value, 10) || DEFAULT_OUTPUT_DIMENSION;
        let outputHeight = parseInt(outputHeightInput.value, 10) || DEFAULT_OUTPUT_DIMENSION;

        outputWidth = Math.max(64, Math.min(2048, outputWidth));
        outputHeight = Math.max(64, Math.min(2048, outputHeight));
        
        const instructions = promptInput.value.trim();
        const seed = Math.floor(Math.random() * 10000000);
        const POLLINATIONS_TOKEN = 'sugamdeol';

        let apiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(instructions)}` +
                       `?model=gptimage` + 
                       `&token=${POLLINATIONS_TOKEN}` +
                       `&seed=${seed}` +
                       `&width=${outputWidth}` +
                       `&height=${outputHeight}` +
                       `&quality=${selectedQuality}` + 
                       `&nologo=true`;

        if (currentMode === 'edit' && uploadedFileUrl) {
            apiUrl += `&image=${encodeURIComponent(uploadedFileUrl)}`;
        }
        
        try {
            const response = await fetch(apiUrl);

            if (!response.ok) {
                let errorDetail = `API returned status ${response.status}.`;
                try {
                    const errorText = await response.text();
                    if(errorText.length < 200 && errorText.length > 0) { 
                         errorDetail += ` Details: ${errorText}`;
                    } else if (errorText.length === 0) {
                        errorDetail += ` No additional details from API.`;
                    }
                } catch (e) { /* ignore */ }
                throw new Error(errorDetail);
            }

            const imageBlob = await response.blob();
            if (!imageBlob.type.startsWith('image/')) {
                throw new Error('API did not return a valid image. Please try different instructions, image, or quality setting.');
            }

            const generatedImageUrl = URL.createObjectURL(imageBlob);
            resultImage.src = generatedImageUrl;
            downloadLink.href = generatedImageUrl;
            downloadLink.download = `transformed_${Date.now()}.${imageBlob.type.split('/')[1] || 'png'}`;
            
            resultSection.style.display = 'block';
            downloadLink.style.display = 'inline-block';
            editGeneratedImageButton.style.display = 'inline-block';
            setStatus('Transformation complete! ', false, true);

        } catch (error) {
            console.error('Error transforming image:', error);
            setStatus(`Error: ${error.message}. Please try again or adjust your prompt/image/quality.`, true);
            resultSection.style.display = 'none';
        } finally {
            setLoadingState(false);
            // Call endMiniGame regardless of success or failure,
            // but ensure it's called after any potential game over screen has had a chance to display.
            // A small delay might be good if the API call is super fast, but usually not needed.
            endMiniGame(); 
            creativeCornerDiv.style.display = 'none'; 
        }
    }

    function setLoadingState(isLoading) {
        transformButton.disabled = isLoading;
        if (isLoading) {
            spinner.style.display = 'block';
            buttonText.textContent = 'Processing...';
        } else {
            spinner.style.display = 'none';
            buttonText.textContent = currentMode === 'edit' ? 'Transform!' : 'Create!';
            checkFormValidity();
            // Do not call endMiniGame here, it's handled by handleTransform's finally block
            // or if user switches mode.
        }
    }

    function setStatus(message, isError = false, isSuccess = false) {
        statusMessage.textContent = message;
        statusMessage.classList.remove('error', 'success');
        if (isError) {
            statusMessage.classList.add('error');
        } else if (isSuccess) {
            statusMessage.classList.add('success');
        }
    }

    handleModeChange({ target: { value: document.querySelector('input[name="generationMode"]:checked').value } });
});
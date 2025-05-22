// Add to the top of the file with other variables
let galleryItems = JSON.parse(localStorage.getItem('picvaan-gallery') || '[]');

// Add after DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    // Existing code...

    // Initialize Sugam Splash
    const splash = new SugamSplash({
        theme: 'forest',
        minDisplayTime: 5000,
        lineLoadDuration: 3000
    });
    splash.show();
    window.addEventListener('load', () => splash._handleWindowLoad());

    // Initialize gallery
    renderGallery();
});

// Add these new functions
function saveToGallery(imageUrl, prompt) {
    const newItem = {
        id: Date.now(),
        imageUrl,
        prompt,
        timestamp: new Date().toISOString()
    };
    galleryItems.unshift(newItem);
    if (galleryItems.length > 20) {
        galleryItems.pop(); // Keep only the latest 20 items
    }
    localStorage.setItem('picvaan-gallery', JSON.stringify(galleryItems));
    renderGallery();
}

function renderGallery() {
    const galleryGrid = document.getElementById('galleryGrid');
    galleryGrid.innerHTML = '';
    
    galleryItems.forEach(item => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.prompt}">
            <div class="gallery-overlay">
                <div class="gallery-actions">
                    <button class="gallery-button" onclick="editGalleryImage('${item.imageUrl}')">Edit</button>
                    <button class="gallery-button" onclick="downloadGalleryImage('${item.imageUrl}')">Download</button>
                    <button class="gallery-button" onclick="deleteGalleryImage(${item.id})">Delete</button>
                </div>
            </div>
        `;
        galleryGrid.appendChild(galleryItem);
    });
}

function editGalleryImage(imageUrl) {
    if (currentMode !== 'edit') {
        currentMode = 'edit';
        modeEditRadio.checked = true;
        updateUIVisibility();
    }
    processImageInput(imageUrl, "gallery image");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function downloadGalleryImage(imageUrl) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `picvaan_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function deleteGalleryImage(id) {
    if (confirm('Are you sure you want to delete this image?')) {
        galleryItems = galleryItems.filter(item => item.id !== id);
        localStorage.setItem('picvaan-gallery', JSON.stringify(galleryItems));
        renderGallery();
    }
}

// Modify the handleTransform function to save to gallery
async function handleTransform() {
    // Existing code...

    try {
        // Existing code...

        // After successful generation, save to gallery
        saveToGallery(generatedImageUrl, promptValue);

        // Rest of the existing code...
    } catch (error) {
        // Existing error handling...
    }
}

// Rest of the existing code remains unchanged
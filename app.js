// DO NO HARM MANDATE: Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    
    // --- SUPABASE CONFIGURATION ---
    // PASTE YOUR SUPABASE URL AND ANON KEY HERE
    const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
    const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
    
    // Safety check: Ensure Supabase script loaded
    if (typeof supabase === 'undefined') {
        console.error("Supabase CDN not loaded.");
        return;
    }
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- DOM ELEMENTS ---
    const viewList = document.getElementById('view-list');
    const viewAdd = document.getElementById('view-add');
    const fabAdd = document.getElementById('fab-add');
    const btnShowAdd = document.getElementById('btn-show-add');
    const keysContainer = document.getElementById('keys-container');
    const searchInput = document.getElementById('search-input');
    const loadingText = document.getElementById('loading-text');
    
    const inputUnit = document.getElementById('input-unit');
    const inputColorValue = document.getElementById('input-color-value');
    
    const cameraVideo = document.getElementById('camera-video');
    const cameraPreview = document.getElementById('camera-preview');
    const btnCapture = document.getElementById('btn-capture');
    const btnRetake = document.getElementById('btn-retake');
    const cameraCanvas = document.getElementById('camera-canvas');
    
    const btnSave = document.getElementById('btn-save');
    const quadrantGrid = document.getElementById('quadrant-grid');
    const sideBtns = document.querySelectorAll('.side-btn');

    // Modal Elements
    const photoModal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('modal-img');
    const btnCloseModal = document.getElementById('btn-close-modal');
    
    const modalViewMode = document.getElementById('modal-view-mode');
    const modalEditMode = document.getElementById('modal-edit-mode');
    const modalTitle = document.getElementById('modal-title');
    const modalSubtitle = document.getElementById('modal-subtitle');
    const modalVisualMap = document.getElementById('modal-visual-map');
    const modalColorDot = document.getElementById('modal-color-dot');
    const modalColorText = document.getElementById('modal-color-text');
    
    const btnModalEdit = document.getElementById('btn-modal-edit');
    const btnModalDelete = document.getElementById('btn-modal-delete');
    const btnModalSave = document.getElementById('btn-modal-save');
    const btnModalCancel = document.getElementById('btn-modal-cancel');
    const modalEditUnit = document.getElementById('modal-edit-unit');
    const modalEditColorValue = document.getElementById('modal-edit-color-value');
    const modalSideBtns = document.querySelectorAll('.modal-side-btn');

    // --- STATE ---
    let currentSide = 'Front Cover';
    let currentQuadrant = 1;
    let editCurrentSide = 'Front Cover';
    let editCurrentQuadrant = 1;
    let allKeys =[];
    let cameraStream = null;
    let capturedBlob = null;
    let currentActiveKey = null;
    let customColors = JSON.parse(localStorage.getItem('customColors') || '[]');

    const defaultColors =[
        { hex: '#ef4444', name: 'Red' }, { hex: '#fca5a5', name: 'Light Red' },
        { hex: '#3b82f6', name: 'Blue' }, { hex: '#93c5fd', name: 'Light Blue' },
        { hex: '#22c55e', name: 'Green' }, { hex: '#86efac', name: 'Light Green' },
        { hex: '#eab308', name: 'Yellow' }, { hex: '#fde047', name: 'Light Yellow' },
        { hex: '#f97316', name: 'Orange' }, { hex: '#fdba74', name: 'Light Orange' },
        { hex: '#a855f7', name: 'Purple' }, { hex: '#d8b4fe', name: 'Light Purple' },
        { hex: '#ec4899', name: 'Pink' }, { hex: '#f9a8d4', name: 'Light Pink' },
        { hex: '#ffffff', name: 'White' }, { hex: '#9ca3af', name: 'Gray' },
        { hex: '#000000', name: 'Black' }, { hex: '#94a3b8', name: 'Silver' }
    ];

    // --- INITIALIZATION ---
    initGrid();
    renderColorPickers();
    loadCachedKeys();
    fetchKeys();

    // --- EVENT LISTENERS ---
    if (fabAdd) fabAdd.addEventListener('click', () => toggleView(true));
    if (btnShowAdd) btnShowAdd.addEventListener('click', () => toggleView(false));
    if (searchInput) searchInput.addEventListener('input', (e) => filterKeys(e.target.value));
    if (btnSave) btnSave.addEventListener('click', handleSaveKey);
    
    if (btnCapture) btnCapture.addEventListener('click', capturePhoto);
    if (btnRetake) btnRetake.addEventListener('click', retakePhoto);

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            if(photoModal) photoModal.style.display = 'none';
        });
    }

    if (btnModalEdit) btnModalEdit.addEventListener('click', enableEditMode);
    if (btnModalCancel) btnModalCancel.addEventListener('click', disableEditMode);
    if (btnModalSave) btnModalSave.addEventListener('click', saveEdit);
    if (btnModalDelete) btnModalDelete.addEventListener('click', deleteKey);

    // Add View Side Buttons
    sideBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            sideBtns.forEach(b => {
                b.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-700');
                b.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
            });
            const target = e.target;
            target.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
            target.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-700');
            currentSide = target.getAttribute('data-side');
        });
    });

    // Edit View Side Buttons
    if (modalSideBtns) {
        modalSideBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                modalSideBtns.forEach(b => {
                    b.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-700');
                    b.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
                });
                const target = e.target;
                target.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
                target.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-700');
                editCurrentSide = target.getAttribute('data-side');
            });
        });
    }

    // --- FUNCTIONS ---

    function getColorName(hex) {
        if (!hex) return 'Custom';
        const allColors = [...defaultColors, ...customColors];
        const found = allColors.find(c => c.hex.toLowerCase() === hex.toLowerCase());
        return found ? found.name : 'Custom';
    }

    function renderColorPickers() {
        const containers =[
            { el: document.getElementById('color-picker-container'), input: document.getElementById('input-color-value') },
            { el: document.getElementById('modal-edit-color-container'), input: document.getElementById('modal-edit-color-value') }
        ];
        
        const allColors = [...defaultColors, ...customColors];
        
        containers.forEach(containerObj => {
            if (!containerObj.el) return;
            
            // DO NO HARM: Clear safely
            while (containerObj.el.firstChild) {
                containerObj.el.removeChild(containerObj.el.firstChild);
            }
            
            allColors.forEach(color => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'color-swatch w-8 h-8 rounded-full border-2 border-slate-300 shrink-0';
                btn.style.backgroundColor = color.hex;
                btn.title = color.name;
                
                if (containerObj.input && containerObj.input.value.toLowerCase() === color.hex.toLowerCase()) {
                    btn.classList.add('active-color');
                }
                
                btn.addEventListener('click', () => {
                    Array.from(containerObj.el.children).forEach(c => c.classList.remove('active-color'));
                    btn.classList.add('active-color');
                    if (containerObj.input) containerObj.input.value = color.hex;
                });
                
                containerObj.el.appendChild(btn);
            });
            
            // Add custom color button
            const addBtnWrap = document.createElement('div');
            addBtnWrap.className = 'relative w-8 h-8 rounded-full border-2 border-slate-300 overflow-hidden flex items-center justify-center bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 cursor-pointer shrink-0';
            addBtnWrap.title = "Add Custom Color";
            
            const addInput = document.createElement('input');
            addInput.type = 'color';
            addInput.className = 'absolute inset-0 w-full h-full opacity-0 cursor-pointer';
            
            addInput.addEventListener('change', (e) => {
                const newHex = e.target.value;
                const newName = prompt("Enter a name for this custom color:");
                if (newName && newName.trim() !== "") {
                    customColors.push({ hex: newHex, name: newName.trim() });
                    localStorage.setItem('customColors', JSON.stringify(customColors));
                    if (containerObj.input) containerObj.input.value = newHex;
                    renderColorPickers(); // Re-render to show new color
                }
            });
            
            addBtnWrap.appendChild(addInput);
            containerObj.el.appendChild(addBtnWrap);
        });
    }

    function toggleView(showAdd) {
        if (!viewList || !viewAdd || !fabAdd || !btnShowAdd) return;
        if (showAdd) {
            viewList.classList.add('hidden');
            fabAdd.classList.add('hidden');
            viewAdd.classList.remove('hidden');
            viewAdd.classList.add('flex');
            btnShowAdd.classList.remove('hidden');
            btnShowAdd.textContent = 'Cancel';
            startCamera();
        } else {
            viewAdd.classList.add('hidden');
            viewAdd.classList.remove('flex');
            viewList.classList.remove('hidden');
            fabAdd.classList.remove('hidden');
            btnShowAdd.classList.add('hidden');
            stopCamera();
            // Reset form
            if (inputUnit) inputUnit.value = '';
            retakePhoto();
        }
    }

    function initGrid() {
        if (quadrantGrid) {
            // DO NO HARM: Using createElement instead of innerHTML
            for (let i = 1; i <= 16; i++) {
                const btn = document.createElement('button');
                btn.className = 'quadrant-btn';
                btn.textContent = i;
                if (i === currentQuadrant) btn.classList.add('active-quadrant');
                
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    Array.from(quadrantGrid.children).forEach(b => b.classList.remove('active-quadrant'));
                    btn.classList.add('active-quadrant');
                    currentQuadrant = i;
                });
                quadrantGrid.appendChild(btn);
            }
        }

        const modalEditGrid = document.getElementById('modal-edit-quadrant-grid');
        if (modalEditGrid) {
            for (let i = 1; i <= 16; i++) {
                const btn = document.createElement('button');
                btn.className = 'quadrant-btn';
                btn.textContent = i;
                
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    Array.from(modalEditGrid.children).forEach(b => b.classList.remove('active-quadrant'));
                    btn.classList.add('active-quadrant');
                    editCurrentQuadrant = i;
                });
                modalEditGrid.appendChild(btn);
            }
        }
    }

    function loadCachedKeys() {
        const cached = localStorage.getItem('keysCache');
        if (cached) {
            try {
                allKeys = JSON.parse(cached);
                renderKeys(allKeys);
            } catch (e) {
                console.error("Cache parse error", e);
            }
        }
    }

    async function fetchKeys() {
        if (!keysContainer || !loadingText) return;
        
        const lastSync = localStorage.getItem('lastSyncTime');
        const syncStartTime = new Date().toISOString();
        
        let query = supabaseClient.from('keys').select('*');
        if (lastSync) {
            query = query.gt('updated_at', lastSync); // Delta Sync: Only fetch what changed
        }

        const { data, error } = await query;

        if (error) {
            if (allKeys.length === 0) loadingText.textContent = "Error loading keys.";
            console.error(error);
            return;
        }

        if (data && data.length > 0) {
            // Merge new/updated data into allKeys
            data.forEach(updatedKey => {
                const index = allKeys.findIndex(k => k.id === updatedKey.id);
                if (index !== -1) {
                    allKeys[index] = updatedKey;
                } else {
                    allKeys.push(updatedKey);
                }
            });
        }

        // Filter out soft-deleted keys
        allKeys = allKeys.filter(k => k.deleted !== true);
        
        // Sort by created_at descending
        allKeys.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        localStorage.setItem('keysCache', JSON.stringify(allKeys));
        localStorage.setItem('lastSyncTime', syncStartTime);
        
        renderKeys(allKeys);
    }

    function renderKeys(keysToRender) {
        if (!keysContainer || !loadingText) return;
        
        // Clear existing
        while (keysContainer.firstChild) {
            keysContainer.removeChild(keysContainer.firstChild);
        }

        if (keysToRender.length === 0) {
            loadingText.textContent = "No keys found.";
            keysContainer.appendChild(loadingText);
            return;
        }

        keysToRender.forEach(key => {
            const card = document.createElement('div');
            card.className = 'key-card';
            card.addEventListener('click', () => openModal(key));

            const img = document.createElement('img');
            img.className = 'key-thumbnail';
            img.src = key.image_url;
            img.alt = `Key ${key.unit}`;
            img.loading = 'lazy';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'flex flex-col flex-1';

            const title = document.createElement('h3');
            title.className = 'font-bold text-slate-800 text-lg leading-tight';
            title.textContent = key.unit;

            const locationWrap = document.createElement('div');
            locationWrap.className = 'flex items-center gap-2 mt-1';

            const miniGrid = document.createElement('div');
            miniGrid.className = 'grid grid-cols-4 gap-[1px] w-5 h-5 bg-slate-300 p-[1px] rounded-[3px] shrink-0';
            for(let i=1; i<=16; i++) {
                const cell = document.createElement('div');
                cell.className = `w-full h-full rounded-[1px] ${i === key.quadrant ? 'bg-blue-600' : 'bg-white'}`;
                miniGrid.appendChild(cell);
            }

            const locationText = document.createElement('p');
            locationText.className = 'text-sm text-slate-500';
            locationText.textContent = `${key.side} - Q${key.quadrant}`;

            locationWrap.appendChild(miniGrid);
            locationWrap.appendChild(locationText);

            const colorWrap = document.createElement('div');
            colorWrap.className = 'text-xs text-slate-600 font-medium mt-1 flex items-center';
            
            const colorDot = document.createElement('span');
            colorDot.className = 'tag-color-indicator';
            colorDot.style.backgroundColor = key.color || '#cbd5e1';

            const colorText = document.createElement('span');
            colorText.textContent = getColorName(key.color);

            colorWrap.appendChild(colorDot);
            colorWrap.appendChild(colorText);

            infoDiv.appendChild(title);
            infoDiv.appendChild(locationWrap);
            infoDiv.appendChild(colorWrap);

            card.appendChild(img);
            card.appendChild(infoDiv);

            keysContainer.appendChild(card);
        });
    }

    function filterKeys(searchTerm) {
        const term = searchTerm.toLowerCase();
        const filtered = allKeys.filter(key => 
            key.unit.toLowerCase().includes(term) || 
            getColorName(key.color).toLowerCase().includes(term)
        );
        renderKeys(filtered);
    }

    function openModal(key) {
        if (!photoModal || !modalImg || !modalTitle) return;
        currentActiveKey = key;
        
        modalImg.src = key.image_url;
        modalTitle.textContent = key.unit;
        modalSubtitle.textContent = `${key.side} - Quadrant ${key.quadrant}`;
        
        if (modalColorDot) modalColorDot.style.backgroundColor = key.color || '#cbd5e1';
        if (modalColorText) modalColorText.textContent = getColorName(key.color);

        // Generate Visual Map for Modal
        if (modalVisualMap) {
            modalVisualMap.innerHTML = ''; // Safe here, clearing empty divs
            for(let i=1; i<=16; i++) {
                const cell = document.createElement('div');
                cell.className = `w-full h-full rounded-[2px] ${i === key.quadrant ? 'bg-blue-600 shadow-sm scale-110 z-10' : 'bg-white'}`;
                modalVisualMap.appendChild(cell);
            }
        }

        disableEditMode();
        photoModal.style.display = 'flex';
    }

    function enableEditMode() {
        if (!currentActiveKey || !modalViewMode || !modalEditMode) return;
        modalViewMode.classList.add('hidden');
        modalEditMode.classList.remove('hidden');
        modalEditMode.classList.add('flex');
        
        if (modalEditUnit) modalEditUnit.value = currentActiveKey.unit;
        
        if (modalEditColorValue) {
            modalEditColorValue.value = currentActiveKey.color || '#ffffff';
            renderColorPickers(); // Re-render to set active state
        }

        // Set Edit Side
        editCurrentSide = currentActiveKey.side || 'Front Cover';
        if (modalSideBtns) {
            modalSideBtns.forEach(b => {
                if (b.getAttribute('data-side') === editCurrentSide) {
                    b.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
                    b.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-700');
                } else {
                    b.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-700');
                    b.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
                }
            });
        }

        // Set Edit Quadrant
        editCurrentQuadrant = currentActiveKey.quadrant || 1;
        const modalEditGrid = document.getElementById('modal-edit-quadrant-grid');
        if (modalEditGrid) {
            Array.from(modalEditGrid.children).forEach((b, index) => {
                if (index + 1 === editCurrentQuadrant) {
                    b.classList.add('active-quadrant');
                } else {
                    b.classList.remove('active-quadrant');
                }
            });
        }

        if (btnModalEdit) btnModalEdit.classList.add('hidden');
    }

    function disableEditMode() {
        if (!modalViewMode || !modalEditMode) return;
        modalEditMode.classList.add('hidden');
        modalEditMode.classList.remove('flex');
        modalViewMode.classList.remove('hidden');
        if (btnModalEdit) btnModalEdit.classList.remove('hidden');
    }

    async function saveEdit() {
        if (!currentActiveKey || !modalEditUnit || !modalEditColorValue) return;
        
        const newUnit = modalEditUnit.value.trim();
        const newColor = modalEditColorValue.value;
        const newSide = editCurrentSide;
        const newQuadrant = editCurrentQuadrant;
        
        if (!newUnit) return alert("Unit cannot be empty.");

        const originalText = btnModalSave.textContent;
        btnModalSave.textContent = "Saving...";
        btnModalSave.disabled = true;

        try {
            const { error } = await supabaseClient
                .from('keys')
                .update({ unit: newUnit, color: newColor, side: newSide, quadrant: newQuadrant })
                .eq('id', currentActiveKey.id);

            if (error) throw error;

            // Update local state
            const index = allKeys.findIndex(k => k.id === currentActiveKey.id);
            if (index !== -1) {
                allKeys[index].unit = newUnit;
                allKeys[index].color = newColor;
                allKeys[index].side = newSide;
                allKeys[index].quadrant = newQuadrant;
            }
            
            localStorage.setItem('keysCache', JSON.stringify(allKeys));
            
            // Refresh UI
            renderKeys(allKeys);
            openModal(allKeys[index]); // Re-open with new data
            
        } catch (err) {
            console.error(err);
            alert("Error updating key: " + err.message);
        } finally {
            btnModalSave.textContent = originalText;
            btnModalSave.disabled = false;
        }
    }

    async function deleteKey() {
        if (!currentActiveKey) return;
        
        const confirmed = confirm(`Are you sure you want to delete the key for ${currentActiveKey.unit}? This cannot be undone.`);
        if (!confirmed) return;

        const originalText = btnModalDelete.textContent;
        btnModalDelete.textContent = "Deleting...";
        btnModalDelete.disabled = true;

        try {
            // Soft Delete from Database to allow Delta Sync to catch it
            const { error: dbError } = await supabaseClient
                .from('keys')
                .update({ deleted: true })
                .eq('id', currentActiveKey.id);

            if (dbError) throw dbError;

            // Extract filename from URL to delete from Storage (Optional but good practice)
            try {
                const urlParts = currentActiveKey.image_url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                await supabaseClient.storage.from('key_images').remove([fileName]);
            } catch (storageErr) {
                console.warn("Could not delete image from storage, but DB record was removed.", storageErr);
            }

            // Remove from local state and update cache
            allKeys = allKeys.filter(k => k.id !== currentActiveKey.id);
            localStorage.setItem('keysCache', JSON.stringify(allKeys));
            
            // Refresh UI
            renderKeys(allKeys);
            if (photoModal) photoModal.style.display = 'none';
            
        } catch (err) {
            console.error(err);
            alert("Error deleting key: " + err.message);
        } finally {
            btnModalDelete.textContent = originalText;
            btnModalDelete.disabled = false;
        }
    }

    // --- CAMERA CONTROLS ---
    async function startCamera() {
        if (!cameraVideo) return;
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
            });
            cameraVideo.srcObject = cameraStream;
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please ensure permissions are granted.");
        }
    }

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
    }

    function capturePhoto() {
        if (!cameraVideo || !cameraCanvas || !cameraPreview || !btnCapture || !btnRetake) return;
        
        const ctx = cameraCanvas.getContext('2d');
        const videoWidth = cameraVideo.videoWidth;
        const videoHeight = cameraVideo.videoHeight;
        
        // Determine the shortest side to make a perfect square crop from the center
        const minSide = Math.min(videoWidth, videoHeight);
        const startX = (videoWidth - minSide) / 2;
        const startY = (videoHeight - minSide) / 2;

        const MAX_SIZE = 600;
        const finalSize = Math.min(minSide, MAX_SIZE);
        
        cameraCanvas.width = finalSize;
        cameraCanvas.height = finalSize;
        
        // Draw only the center square of the video (matches Tailwind's object-cover)
        ctx.drawImage(
            cameraVideo, 
            startX, startY, minSide, minSide, // Source crop coordinates & size
            0, 0, finalSize, finalSize        // Destination canvas coordinates & size
        );
        
        // Convert to blob for upload immediately
        cameraCanvas.toBlob((blob) => {
            capturedBlob = blob;
            const objectUrl = URL.createObjectURL(blob);
            cameraPreview.src = objectUrl;
            
            cameraPreview.classList.remove('hidden');
            btnCapture.classList.add('hidden');
            btnRetake.classList.remove('hidden');
            cameraVideo.classList.add('hidden');
        }, 'image/webp', 0.3); // <--- QUALITY REDUCED TO 0.3 FOR MAX STORAGE SAVINGS
    }

    function retakePhoto() {
        if (!cameraPreview || !btnCapture || !btnRetake || !cameraVideo) return;
        capturedBlob = null;
        cameraPreview.classList.add('hidden');
        btnCapture.classList.remove('hidden');
        btnRetake.classList.add('hidden');
        cameraVideo.classList.remove('hidden');
    }

    async function handleSaveKey() {
        if (!inputUnit || !inputColorValue || !btnSave) return;
        
        const unit = inputUnit.value.trim();
        const color = inputColorValue.value;

        if (!unit || !capturedBlob) {
            alert("Please provide a Unit Number and capture a Photo.");
            return;
        }

        btnSave.textContent = "Processing Image...";
        btnSave.disabled = true;
        btnSave.classList.add('opacity-50');

        try {
            // 1. Image is already processed and compressed via Canvas in capturePhoto()
            const compressedBlob = capturedBlob;

            // 2. Upload to Supabase Storage
            btnSave.textContent = "Uploading...";
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
            
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('key_images')
                .upload(fileName, compressedBlob, {
                    contentType: 'image/webp'
                });

            if (uploadError) throw uploadError;

            // 3. Get Public URL
            const { data: publicUrlData } = supabaseClient
                .storage
                .from('key_images')
                .getPublicUrl(fileName);

            // 4. Save to Database
            btnSave.textContent = "Saving Database Record...";
            const { data: insertData, error: insertError } = await supabaseClient
                .from('keys')
                .insert([
                    { 
                        unit: unit, 
                        color: color, 
                        side: currentSide, 
                        quadrant: currentQuadrant, 
                        image_url: publicUrlData.publicUrl 
                    }
                ]);

            if (insertError) throw insertError;

            // 5. Success cleanup
            // We don't alert here to make batch entry faster
            toggleView(false);
            fetchKeys(); // Refresh list

        } catch (error) {
            console.error("Save error:", error);
            alert("Error saving key: " + error.message);
        } finally {
            btnSave.textContent = "Save Key to Database";
            btnSave.disabled = false;
            btnSave.classList.remove('opacity-50');
        }
    }

    // Register Service Worker for Offline App Shell
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error('SW registration failed:', err));
    }
});
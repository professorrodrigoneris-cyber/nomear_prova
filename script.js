document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const fileInput = document.getElementById('pdfFile');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileWrapper = document.querySelector('.file-upload-wrapper');
    const classSelect = document.getElementById('classSelect');
    const btnVisualize = document.getElementById('visualizeBtn');
    const btnGenerate = document.getElementById('generateBtn');
    const statusBox = document.getElementById('statusMessage');
    
    // Student Selection Elements
    const selectAllStudents = document.getElementById('selectAllStudents');
    const selectSpecificBtn = document.getElementById('selectSpecificBtn');
    const studentsModal = document.getElementById('studentsModal');
    const closeStudentsModal = document.getElementById('closeStudentsModal');
    const studentsList = document.getElementById('studentsList');
    const confirmStudentsBtn = document.getElementById('confirmStudentsBtn');
    
    let selectedStudents = [];
    let useSpecificStudents = false;

    // Settings
    const inputSize = document.getElementById('fontSize');
    const checkBlank = document.getElementById('addBlank');

    let pdfPosX = 100;
    let pdfPosY = 750;
    let isPositionVerified = false;

    // Modal
    const modal = document.getElementById('previewModal');
    const btnCloseModal = document.getElementById('closeModal');
    const confirmPosBtn = document.getElementById('confirmPosBtn');
    const canvasWrapper = document.getElementById('canvasWrapper');
    const pdfCanvas = document.getElementById('pdfCanvas');
    const dragBox = document.getElementById('dragBox');
    
    // Checklist
    const checkFile = document.getElementById('checkFile');
    const checkPos = document.getElementById('checkPos');

    let pdfFileBuffer = null;
    let pdfWidth = 0;
    let pdfHeight = 0;
    
    // Configura o worker do PDF.js
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const { PDFDocument, rgb, StandardFonts } = PDFLib;

    function updateGenerateBtnState() {
        const fileOk = !!pdfFileBuffer;
        
        if (fileOk) {
            checkFile.classList.add('done');
            checkFile.querySelector('span:first-child').textContent = '✓';
        } else {
            checkFile.classList.remove('done');
            checkFile.querySelector('span:first-child').textContent = '○';
        }

        if (isPositionVerified) {
            checkPos.classList.add('done');
            checkPos.querySelector('span:first-child').textContent = '✓';
        } else {
            checkPos.classList.remove('done');
            checkPos.querySelector('span:first-child').textContent = '○';
        }

        const isReady = fileOk && isPositionVerified;
        
        btnGenerate.disabled = !isReady;
        if (isReady) {
            btnGenerate.style.opacity = '1';
            btnGenerate.style.cursor = 'pointer';
        } else {
            btnGenerate.style.opacity = '0.5';
            btnGenerate.style.cursor = 'not-allowed';
        }
    }
    updateGenerateBtnState();

    // Initialize Select Dropdown
    if (typeof classLists !== 'undefined') {
        const classes = Object.keys(classLists);
        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            classSelect.appendChild(option);
        });
    } else {
        showStatus('Erro: Dados das turmas não encontrados.', 'error');
    }

    // Student Selection Logic
    classSelect.addEventListener('change', () => {
        selectAllStudents.checked = true;
        useSpecificStudents = false;
        selectedStudents = [];
    });

    selectAllStudents.addEventListener('change', (e) => {
        if (e.target.checked) {
            useSpecificStudents = false;
            selectedStudents = [];
        } else {
            openStudentsModal();
        }
    });

    selectSpecificBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openStudentsModal();
    });

    function openStudentsModal() {
        const className = classSelect.value;
        if (!className) {
            showStatus('Por favor, selecione uma turma primeiro.', 'error');
            selectAllStudents.checked = true;
            return;
        }

        const nomes = classLists[className];
        studentsList.innerHTML = '';

        nomes.forEach(nome => {
            const li = document.createElement('li');
            const label = document.createElement('label');
            label.className = 'custom-checkbox';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = nome;
            
            if (useSpecificStudents) {
                checkbox.checked = selectedStudents.includes(nome);
            } else {
                checkbox.checked = false;
            }

            const checkmark = document.createElement('span');
            checkmark.className = 'checkmark';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = nome;

            label.appendChild(checkbox);
            label.appendChild(checkmark);
            label.appendChild(nameSpan);

            li.appendChild(label);
            studentsList.appendChild(li);
        });

        studentsModal.classList.remove('hidden');
    }

    closeStudentsModal.addEventListener('click', () => {
        studentsModal.classList.add('hidden');
        if (!useSpecificStudents && !selectAllStudents.checked) {
           selectAllStudents.checked = true;
        }
    });

    studentsModal.addEventListener('click', (e) => {
        if (e.target === studentsModal) {
            closeStudentsModal.click();
        }
    });

    confirmStudentsBtn.addEventListener('click', () => {
        const className = classSelect.value;
        const nomes = classLists[className];
        const checkboxes = studentsList.querySelectorAll('input[type="checkbox"]');
        
        selectedStudents = [];
        checkboxes.forEach(cb => {
            if (cb.checked) {
                selectedStudents.push(cb.value);
            }
        });

        if (selectedStudents.length === nomes.length) {
            useSpecificStudents = false;
            selectAllStudents.checked = true;
            studentsModal.classList.add('hidden');
        } else if (selectedStudents.length === 0) {
            showStatus('Você precisa selecionar pelo menos um aluno.', 'error');
        } else {
            useSpecificStudents = true;
            selectAllStudents.checked = false;
            studentsModal.classList.add('hidden');
        }
    });

    // Load saved settings from localStorage
    loadSettings();

    // File Upload Handlers
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
            fileNameDisplay.style.color = 'var(--text-main)';
            try {
                const arrayBuffer = await file.arrayBuffer();
                pdfFileBuffer = new Uint8Array(arrayBuffer);
                isPositionVerified = false;
                updateGenerateBtnState();
                showStatus('PDF carregado com sucesso!', 'info');
                setTimeout(() => hideStatus(), 3000);
            } catch (err) {
                showStatus('Erro ao ler o arquivo PDF.', 'error');
            }
        } else {
            fileNameDisplay.textContent = 'Clique ou arraste o seu PDF aqui...';
            fileNameDisplay.style.color = 'var(--text-muted)';
            pdfFileBuffer = null;
            isPositionVerified = false;
            updateGenerateBtnState();
        }
    });

    // Drag and Drop Effects
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileWrapper.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        fileWrapper.addEventListener(eventName, () => {
            fileWrapper.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileWrapper.addEventListener(eventName, () => {
            fileWrapper.classList.remove('dragover');
        }, false);
    });

    fileWrapper.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            fileInput.files = files;
            const event = new Event('change');
            fileInput.dispatchEvent(event);
        } else {
            showStatus('Por favor, envie apenas arquivos em formato PDF.', 'error');
        }
    }, false);

    // Save and Load Settings (Local Storage)
    function saveSettings() {
        const settings = {
            fontSize: inputSize.value,
            posX: pdfPosX,
            posY: pdfPosY,
            addBlank: checkBlank.checked
        };
        localStorage.setItem('geradorProvasConfig', JSON.stringify(settings));
    }

    function loadSettings() {
        const saved = localStorage.getItem('geradorProvasConfig');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                if (settings.fontSize) inputSize.value = settings.fontSize;
                if (settings.posX !== undefined) pdfPosX = Number(settings.posX);
                if (settings.posY !== undefined) pdfPosY = Number(settings.posY);
                if (settings.addBlank !== undefined) checkBlank.checked = settings.addBlank;
            } catch(e) {}
        }
    }

    // Validation
    function validateInputs() {
        if (!pdfFileBuffer) {
            showStatus('Por favor, selecione um arquivo PDF primeiro.', 'error');
            return false;
        }
        return true;
    }

    function validateGeneration() {
        if (!validateInputs()) return false;
        if (!classSelect.value) {
            showStatus('Por favor, selecione uma turma/lista de nomes.', 'error');
            return false;
        }
        if (!isPositionVerified) {
            showStatus('Por favor, clique em "Visualizar Posição" e posicione o local antes de gerar as provas.', 'error');
            return false;
        }
        return true;
    }

    // Modal Handlers
    btnCloseModal.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            btnCloseModal.click();
        }
    });

    // Action: Visualize Position
    let isDragging = false;
    let dragStartX, dragStartY, initialLeft, initialTop;
    let currentNormX = 0;
    let currentNormY = 0;

    confirmPosBtn.addEventListener('click', () => {
        if (pdfWidth === 0 || pdfHeight === 0) return;
        
        const fontSize = parseInt(inputSize.value);

        pdfPosX = Math.round(currentNormX * pdfWidth);
        pdfPosY = Math.round(pdfHeight - (currentNormY * pdfHeight) - fontSize);
        
        saveSettings();
        isPositionVerified = true;
        updateGenerateBtnState();
        
        modal.classList.add('hidden');
        showStatus('Posição salva! Botão "Gerar Provas" liberado.', 'success');
        setTimeout(() => hideStatus(), 3000);
    });

    function onMouseDown(e) {
        if (e.target !== dragBox) return;
        isDragging = true;
        dragStartX = e.clientX || (e.touches && e.touches[0].clientX);
        dragStartY = e.clientY || (e.touches && e.touches[0].clientY);
        initialLeft = dragBox.offsetLeft;
        initialTop = dragBox.offsetTop;
        e.preventDefault();
    }

    function onMouseMove(e) {
        if (!isDragging) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        const dx = clientX - dragStartX;
        const dy = clientY - dragStartY;
        
        const wrapperW = canvasWrapper.clientWidth;
        const wrapperH = canvasWrapper.clientHeight;
        
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        newLeft = Math.max(0, Math.min(newLeft, wrapperW - dragBox.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, wrapperH - dragBox.offsetHeight));

        const normLeft = newLeft / wrapperW;
        const normTop = newTop / wrapperH;
        
        currentNormX = normLeft;
        currentNormY = normTop;
        
        dragBox.style.left = `${normLeft * 100}%`;
        dragBox.style.top = `${normTop * 100}%`;
    }

    function onMouseUp() {
        isDragging = false;
    }

    function setupDrag() {
        dragBox.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        dragBox.removeEventListener('touchstart', onMouseDown);
        document.removeEventListener('touchmove', onMouseMove);
        document.removeEventListener('touchend', onMouseUp);

        dragBox.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        dragBox.addEventListener('touchstart', onMouseDown, {passive: false});
        document.addEventListener('touchmove', onMouseMove, {passive: false});
        document.addEventListener('touchend', onMouseUp);
    }

    btnVisualize.addEventListener('click', async () => {
        if (!validateInputs()) return;
        saveSettings();

        try {
            const loadingTask = pdfjsLib.getDocument({data: pdfFileBuffer.slice(0)});
            const pdfDoc = await loadingTask.promise;
            const page = await pdfDoc.getPage(1);
            
            const renderScale = 1.5;
            const viewport = page.getViewport({ scale: renderScale });
            const unscaledViewport = page.getViewport({ scale: 1.0 });
            
            pdfWidth = unscaledViewport.width;
            pdfHeight = unscaledViewport.height;

            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;
            pdfCanvas.style.width = '100%';
            pdfCanvas.style.height = 'auto';
            pdfCanvas.style.maxWidth = `${viewport.width}px`;
            
            const renderContext = {
                canvasContext: pdfCanvas.getContext('2d'),
                viewport: viewport
            };
            await page.render(renderContext).promise;

            const fontSize = parseInt(inputSize.value);
            const textBaselineTopInPoints = pdfHeight - pdfPosY - fontSize;
            
            let normX = pdfPosX / pdfWidth;
            let normY = textBaselineTopInPoints / pdfHeight;
            
            normX = Math.max(0, Math.min(normX, 0.9));
            normY = Math.max(0, Math.min(normY, 0.9));

            currentNormX = normX;
            currentNormY = normY;

            dragBox.style.left = `${normX * 100}%`;
            dragBox.style.top = `${normY * 100}%`;
            dragBox.style.display = 'flex';
            
            modal.classList.remove('hidden');

            setTimeout(() => {
                const displayScale = canvasWrapper.clientWidth / pdfWidth;
                dragBox.style.fontSize = `${Math.max(8, fontSize * displayScale)}px`;
                dragBox.style.padding = `${2 * displayScale}px`;
                setupDrag();
            }, 50);

        } catch (error) {
            console.error(error);
            showStatus('Ocorreu um erro ao gerar a pré-visualização. Verifique se o PDF está legível.', 'error');
        }
    });

    // Action: Generate Named PDFs
    btnGenerate.addEventListener('click', async () => {
        if (!validateGeneration()) return;
        saveSettings();

        const className = classSelect.value;
        let nomes = classLists[className];
        
        if (useSpecificStudents && selectedStudents.length > 0) {
            nomes = selectedStudents;
        }

        if (!nomes || nomes.length === 0) {
            showStatus('A lista de nomes selecionada está vazia.', 'error');
            return;
        }

        const fontSize = parseInt(inputSize.value);
        const fontX = pdfPosX;
        const fontY = pdfPosY;

        showStatus(`Gerando provas para ${nomes.length} alunos da ${className}. Por favor, aguarde...`, 'info');
        btnGenerate.disabled = true;
        btnVisualize.disabled = true;

        try {
            // Create a new document to hold everything
            const finalPdf = await PDFDocument.create();
            const font = await finalPdf.embedFont(StandardFonts.Helvetica); 
            
            // Load the original user document safely cloning the buffer
            const sourceDoc = await PDFDocument.load(pdfFileBuffer.slice(0));
            const numPages = sourceDoc.getPages().length;
            const sourcePageIndices = Array.from({ length: numPages }, (_, i) => i);

            // Iterate over names
            for (let i = 0; i < nomes.length; i++) {
                const nome = nomes[i];
                
                // Copy pages for this student
                const copiedPages = await finalPdf.copyPages(sourceDoc, sourcePageIndices);
                
                // Draw name on the first page
                const firstPage = copiedPages[0];
                firstPage.drawText(nome, {
                    x: fontX,
                    y: fontY,
                    size: fontSize,
                    font: font,
                    color: rgb(0, 0, 0)
                });
                
                // Add all pages to final PDF
                copiedPages.forEach(page => finalPdf.addPage(page));
            }

            // Add clean blank copy at the end if checked
            if (checkBlank.checked) {
                const copiedPages = await finalPdf.copyPages(sourceDoc, sourcePageIndices);
                copiedPages.forEach(page => finalPdf.addPage(page));
            }

            // Save Final PDF
            const finalPdfBytes = await finalPdf.save();
            const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
            
            // Download mechanism
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            
            // Extract original file name
            const originalName = fileInput.files[0].name.replace('.pdf', '');
            a.download = `${originalName}_${className.replace(/ /g, '_')}_nomeada.pdf`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(blobUrl);

            showStatus(`Sucesso! Arquivo gerado validamente com ${nomes.length} provas.`, 'success');

        } catch (error) {
            console.error(error);
            showStatus('Erro durante a geração do PDF. Verifique o console do navegador.', 'error');
        } finally {
            updateGenerateBtnState();
            btnVisualize.disabled = false;
        }
    });

    function showStatus(message, type) {
        statusBox.textContent = message;
        statusBox.className = `status-message msg-${type}`;
        statusBox.classList.remove('hidden');
    }

    function hideStatus() {
        statusBox.classList.add('hidden');
    }
});

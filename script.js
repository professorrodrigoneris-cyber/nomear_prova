document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const fileInput = document.getElementById('pdfFile');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileWrapper = document.querySelector('.file-upload-wrapper');
    const classSelect = document.getElementById('classSelect');
    const btnVisualize = document.getElementById('visualizeBtn');
    const btnGenerate = document.getElementById('generateBtn');
    const statusBox = document.getElementById('statusMessage');
    
    // Settings
    const inputSize = document.getElementById('fontSize');
    const inputX = document.getElementById('posX');
    const inputY = document.getElementById('posY');
    const checkBlank = document.getElementById('addBlank');

    // Modal
    const modal = document.getElementById('previewModal');
    const btnCloseModal = document.getElementById('closeModal');
    const previewFrame = document.getElementById('previewFrame');

    let pdfFileBuffer = null;
    const { PDFDocument, rgb, StandardFonts } = PDFLib;

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
                showStatus('PDF carregado com sucesso!', 'info');
                setTimeout(() => hideStatus(), 3000);
            } catch (err) {
                showStatus('Erro ao ler o arquivo PDF.', 'error');
            }
        } else {
            fileNameDisplay.textContent = 'Clique ou arraste o seu PDF aqui...';
            fileNameDisplay.style.color = 'var(--text-muted)';
            pdfFileBuffer = null;
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
            posX: inputX.value,
            posY: inputY.value,
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
                if (settings.posX) inputX.value = settings.posX;
                if (settings.posY) inputY.value = settings.posY;
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
        return true;
    }

    // Modal Handlers
    btnCloseModal.addEventListener('click', () => {
        modal.classList.add('hidden');
        previewFrame.src = ''; // limpa memória
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            btnCloseModal.click();
        }
    });

    // Action: Visualize Position
    btnVisualize.addEventListener('click', async () => {
        if (!validateInputs()) return;
        saveSettings();

        try {
            const originPdf = await PDFDocument.load(pdfFileBuffer);
            const font = await originPdf.embedFont(StandardFonts.Helvetica);
            
            const firstPage = originPdf.getPages()[0];
            const x = parseInt(inputX.value);
            const y = parseInt(inputY.value);
            
            // Draw a red rectangle (similar to python preview)
            firstPage.drawRectangle({
                x: x - 2,
                y: y - 2,
                width: 150,
                height: 20,
                borderColor: rgb(1, 0, 0),
                borderWidth: 2,
                color: undefined // transparent fill
            });

            // Adiciona o texto "Nome do Aluno (Teste)" para referência do tamanho
            const fontSize = parseInt(inputSize.value);
            firstPage.drawText("Nome do Aluno (Teste)", {
                x: x,
                y: y,
                size: fontSize,
                font: font,
                color: rgb(1, 0, 0)
            });

            const pdfBytes = await originPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            
            previewFrame.src = blobUrl;
            modal.classList.remove('hidden');

        } catch (error) {
            console.error(error);
            showStatus('Ocorreu um erro ao gerar a pré-visualização. Verifique se o PDF está corrompido ou protegido por senha.', 'error');
        }
    });

    // Action: Generate Named PDFs
    btnGenerate.addEventListener('click', async () => {
        if (!validateGeneration()) return;
        saveSettings();

        const className = classSelect.value;
        const nomes = classLists[className];
        
        if (!nomes || nomes.length === 0) {
            showStatus('A lista de nomes selecionada está vazia.', 'error');
            return;
        }

        const fontSize = parseInt(inputSize.value);
        const fontX = parseInt(inputX.value);
        const fontY = parseInt(inputY.value);

        showStatus(`Gerando provas para ${nomes.length} alunos da ${className}. Por favor, aguarde...`, 'info');
        btnGenerate.disabled = true;
        btnVisualize.disabled = true;

        try {
            // Create a new document to hold everything
            const finalPdf = await PDFDocument.create();
            const font = await finalPdf.embedFont(StandardFonts.HelveticaBold); // Using bold font by default to match Arial feel
            
            // Load the original user document
            const sourceDoc = await PDFDocument.load(pdfFileBuffer);
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
            btnGenerate.disabled = false;
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

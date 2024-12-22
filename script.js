let currentFile = null;
const fileHistory = JSON.parse(localStorage.getItem('fileHistory')) || [];

document.getElementById('pdfInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        try {
            const arrayBuffer = await file.arrayBuffer();
            await PDFLib.PDFDocument.load(arrayBuffer); // محاولة تحميل الملف للتحقق من صلاحيته
            currentFile = file;
            document.getElementById('removeBtn').disabled = false;
            document.querySelector('button[onclick="document.getElementById(\'pdfInput\').click()"]').textContent = file.name;
        } catch (error) {
            currentFile = null;
            document.getElementById('removeBtn').disabled = true;
            showPopup('متأكدة من الملف؟');
        }
    } else {
        currentFile = null;
        document.getElementById('removeBtn').disabled = true;
        showPopup('لسى ماتطورت, خلك على PDF');
    }
});

document.getElementById('removeBtn').addEventListener('click', async () => {
    if (!currentFile) return;

    const pageRange = document.getElementById('pageRange').value;
    if (!pageRange) {
        showPopup('الصفحات ي أم ملاذ؟');
        return;
    }

    if (!validatePageRange(pageRange)) {
        showPopup('ماتمشي علي, حطي رقم لو سمحتي');
        return;
    }

    const removeBtn = document.getElementById('removeBtn');

    try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();

        const pagesToRemove = new Set();
        const invalidPages = [];
        pageRange.split('-').forEach(range => {
            const pageNum = Number(range) - 1;
            if (pageNum >= 0 && pageNum < pageCount) {
                pagesToRemove.add(pageNum);
            } else {
                invalidPages.push(pageNum + 1);
            }
        });

        if (invalidPages.length > 0) {
            showPopup(`مين وين جبتي الصفحة ذي؟`);
            removeBtn.disabled = false;
            removeBtn.innerHTML = 'احذفها';
            return;
        }

        if (pagesToRemove.size === 0) {
            showPopup('اعتقيها مافيه الا هي');
            removeBtn.disabled = false;
            removeBtn.innerHTML = 'احذفها';
            return;
        }

        if (pagesToRemove.size === pageCount) {
            showPopup('كلها مره وحده؟ مايمدي');
            removeBtn.disabled = false;
            removeBtn.innerHTML = 'احذفها';
            return;
        }

        const newPdf = await PDFLib.PDFDocument.create();
        const pages = pdfDoc.getPages();
        for (let i = 0; i < pages.length; i++) {
            if (!pagesToRemove.has(i)) {
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
                newPdf.addPage(copiedPage);
            }
        }

        const newPdfBytes = await newPdf.save();
        const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        fileHistory.unshift(currentFile.name);
        updateFileHistory();
        localStorage.setItem('fileHistory', JSON.stringify(fileHistory));

    } catch (error) {
        showPopup('اوف وش صار؟ كلمي ابو ملاذ يصلحني');
        console.error(error);
    } finally {
        removeBtn.disabled = false;
        removeBtn.textContent = 'احذفها';
    }
});

function validatePageRange(pageRange) {
    const regex = /^(\d+(-\d+)*)$/;
    return regex.test(pageRange);
}

function updateFileHistory() {
    const historyList = document.getElementById('fileHistory');
    historyList.innerHTML = fileHistory
        .slice(0, 3)
        .map(filename => `
            <li class="flex items-center gap-2">
                <span class="text-gray-600 text-sm filename">${filename}</span>
                <span class="flex-grow border-t border-gray-300 mx-2"></span>
                <i class="fa-solid fa-circle-arrow-down rotate-icon" onclick="downloadFile('${filename}')"></i>
            </li>
        `)
        .join('');
}

function downloadFile(filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([filename], { type: 'application/pdf' }));
    link.download = filename;
    link.click(); // Programmatically click the link to trigger the download

    const icon = document.querySelector(`i[onclick="downloadFile('${filename}')"]`);
    icon.classList.add('rotate');
    setTimeout(() => {
        icon.classList.remove('rotate');
    }, 3000);
}
function showPopup(message) {
    const popupContainer = document.getElementById('popupContainer');
    const popup = document.createElement('div');
    popup.className = 'bg-red-500 text-white p-2 rounded-lg shadow-lg mb-2';
    popup.textContent = message;
    popupContainer.appendChild(popup);
    setTimeout(() => {
        popup.remove();
    }, 3000);
}

window.addEventListener('beforeunload', () => {
    currentFile = null;
    document.getElementById('pageRange').value = '';
    document.getElementById('removeBtn').disabled = true;
});

// Load file history on page load
document.addEventListener('DOMContentLoaded', updateFileHistory);

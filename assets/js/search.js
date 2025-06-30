// 전역 변수
let allData = [];
let filteredData = [];
let currentViewData = null;

// 페이지 로드 시 초기화
$(document).ready(function() {
    // 오늘 날짜를 기준으로 기본 검색 범위 설정 (지난 30일)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    
    // 자동완성 설정
    setupAutocomplete();
    
    // 초기 데이터 로드
    loadData();
    
    // 자동 검색 (초기에 모든 데이터 표시)
    searchData();
});

// 데이터 로드
function loadData() {
    const savedDataList = JSON.parse(localStorage.getItem('입고요청서_저장목록') || '{}');
    allData = Object.entries(savedDataList).map(([name, data]) => ({
        ...data,
        savedName: name
    }));
    
    // 자동완성 데이터 업데이트
    updateAutocompleteOptions();
}

// 자동완성 설정
function setupAutocomplete() {
    const autocompleteFields = [
        { inputId: 'reqNoFilter', listId: 'reqNoAutocomplete' },
        { inputId: 'reqUserFilter', listId: 'reqUserAutocomplete' },
        { inputId: 'vendorFilter', listId: 'vendorAutocomplete' },
        { inputId: 'itemFilter', listId: 'itemAutocomplete' },
        { inputId: 'categoryFilter', listId: 'categoryAutocomplete' },
        { inputId: 'warehouseFilter', listId: 'warehouseAutocomplete' },
        { inputId: 'deptFilter', listId: 'deptAutocomplete' }
    ];
    
    autocompleteFields.forEach(field => {
        const input = document.getElementById(field.inputId);
        const list = document.getElementById(field.listId);
        
        input.addEventListener('input', function() {
            showAutocomplete(this, list, field.inputId);
        });
        
        input.addEventListener('blur', function() {
            setTimeout(() => {
                list.style.display = 'none';
            }, 200);
        });
        
        input.addEventListener('focus', function() {
            if (this.value) {
                showAutocomplete(this, list, field.inputId);
            }
        });
    });
}

// 자동완성 옵션 업데이트
function updateAutocompleteOptions() {
    // 각 필드별 고유값 수집
    const options = {
        reqNo: new Set(),
        reqUser: new Set(),
        vendor: new Set(),
        item: new Set(),
        category: new Set(),
        warehouse: new Set(),
        dept: new Set()
    };
    
    allData.forEach(data => {
        if (data.reqNo) options.reqNo.add(data.reqNo);
        if (data.reqUser) options.reqUser.add(data.reqUser);
        if (data.refDept) data.refDept.forEach(dept => options.dept.add(dept));
        
        if (data.items) {
            data.items.forEach(item => {
                if (item.vendor) options.vendor.add(item.vendor);
                if (item.item) options.item.add(item.item);
                if (item.cat) options.category.add(item.cat);
                if (item.wh) options.warehouse.add(item.wh);
            });
        }
    });
    
    // 자동완성 데이터 저장
    window.autocompleteOptions = {
        reqNoFilter: Array.from(options.reqNo),
        reqUserFilter: Array.from(options.reqUser),
        vendorFilter: Array.from(options.vendor),
        itemFilter: Array.from(options.item),
        categoryFilter: Array.from(options.category),
        warehouseFilter: Array.from(options.warehouse),
        deptFilter: Array.from(options.dept)
    };
}

// 자동완성 표시
function showAutocomplete(input, list, fieldId) {
    const value = input.value.toLowerCase().trim();
    const options = window.autocompleteOptions[fieldId] || [];
    
    if (!value) {
        list.style.display = 'none';
        return;
    }
    
    const filteredOptions = options.filter(option => 
        option.toLowerCase().includes(value)
    ).slice(0, 10); // 최대 10개만 표시
    
    if (filteredOptions.length === 0) {
        list.style.display = 'none';
        return;
    }
    
    list.innerHTML = filteredOptions.map(option => 
        `<div class="autocomplete-item" onclick="selectAutocomplete('${fieldId}', '${option}')">${option}</div>`
    ).join('');
    
    list.style.display = 'block';
}

// 자동완성 항목 선택
function selectAutocomplete(fieldId, value) {
    document.getElementById(fieldId).value = value;
    document.getElementById(fieldId.replace('Filter', 'Autocomplete')).style.display = 'none';
}

// 검색 실행
function searchData() {
    const filters = {
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        reqNo: document.getElementById('reqNoFilter').value.toLowerCase().trim(),
        reqUser: document.getElementById('reqUserFilter').value.toLowerCase().trim(),
        vendor: document.getElementById('vendorFilter').value.toLowerCase().trim(),
        item: document.getElementById('itemFilter').value.toLowerCase().trim(),
        category: document.getElementById('categoryFilter').value.toLowerCase().trim(),
        warehouse: document.getElementById('warehouseFilter').value.toLowerCase().trim(),
        dept: document.getElementById('deptFilter').value.toLowerCase().trim()
    };
    
    filteredData = allData.filter(data => {
        // 날짜 필터
        if (filters.startDate && data.reqDate < filters.startDate) return false;
        if (filters.endDate && data.reqDate > filters.endDate) return false;
        
        // 요청번호 필터
        if (filters.reqNo && !data.reqNo?.toLowerCase().includes(filters.reqNo)) return false;
        
        // 요청자 필터
        if (filters.reqUser && !data.reqUser?.toLowerCase().includes(filters.reqUser)) return false;
        
        // 부서 필터
        if (filters.dept) {
            const deptMatch = data.refDept?.some(dept => 
                dept.toLowerCase().includes(filters.dept)
            ) || false;
            if (!deptMatch) return false;
        }
        
        // 품목 관련 필터
        if (filters.vendor || filters.item || filters.category || filters.warehouse) {
            const itemMatch = data.items?.some(item => {
                if (filters.vendor && !item.vendor?.toLowerCase().includes(filters.vendor)) return false;
                if (filters.item && !item.item?.toLowerCase().includes(filters.item)) return false;
                if (filters.category && !item.cat?.toLowerCase().includes(filters.category)) return false;
                if (filters.warehouse && !item.wh?.toLowerCase().includes(filters.warehouse)) return false;
                return true;
            }) || false;
            if (!itemMatch) return false;
        }
        
        return true;
    });
    
    displayResults();
}

// 검색 결과 표시
function displayResults() {
    const tbody = document.getElementById('resultsTableBody');
    const countElement = document.getElementById('resultsCount');
    
    countElement.textContent = `총 ${filteredData.length}건`;
    
    if (filteredData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div>검색 조건에 맞는 데이터가 없습니다.</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredData.map((data, index) => {
        const totalItems = data.items?.filter(item => item.item?.trim()).length || 0;
        const totalAmount = data.items?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
        const mainVendors = [...new Set(data.items?.filter(item => item.vendor?.trim()).map(item => item.vendor) || [])];
        const savedDate = new Date(data.savedAt).toLocaleString('ko-KR');
        
        return `
            <tr>
                <td class="checkbox-col">
                    <input type="checkbox" class="row-checkbox" data-index="${index}">
                </td>
                <td>${data.reqDate || '-'}</td>
                <td>${data.reqNo || '-'}</td>
                <td>${data.reqUser || '-'}</td>
                <td>${data.inDate || '-'}</td>
                <td>${totalItems}개</td>
                <td>${totalAmount.toLocaleString()}원</td>
                <td>${mainVendors.slice(0, 2).join(', ')}${mainVendors.length > 2 ? ' 외' : ''}</td>
                <td>${data.refDept?.join(', ') || '-'}</td>
                <td>${savedDate}</td>
                <td class="actions-col">
                    <button class="view-btn" onclick="viewDetails(${index})">보기</button>
                    <button class="delete-btn" onclick="deleteItem('${data.savedName}')">삭제</button>
                </td>
            </tr>
        `;
    }).join('');
    
    // 전체 선택 체크박스 상태 초기화
    document.getElementById('selectAllCheckbox').checked = false;
}

// 필터 초기화
function resetFilters() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    document.getElementById('reqNoFilter').value = '';
    document.getElementById('reqUserFilter').value = '';
    document.getElementById('vendorFilter').value = '';
    document.getElementById('itemFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('warehouseFilter').value = '';
    document.getElementById('deptFilter').value = '';
    
    // 자동완성 목록 숨기기
    document.querySelectorAll('.autocomplete-list').forEach(list => {
        list.style.display = 'none';
    });
    
    searchData();
}

// 전체 선택/해제
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    
    rowCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// 선택된 항목 가져오기
function getSelectedItems() {
    const selectedIndexes = [];
    document.querySelectorAll('.row-checkbox:checked').forEach(checkbox => {
        selectedIndexes.push(parseInt(checkbox.dataset.index));
    });
    return selectedIndexes.map(index => filteredData[index]);
}

// 선택된 항목 엑셀 출력
async function exportSelectedToExcel() {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
        alert('출력할 항목을 선택해주세요.');
        return;
    }
    
    try {
        const workbook = new ExcelJS.Workbook();
        
        for (let i = 0; i < selectedItems.length; i++) {
            const data = selectedItems[i];
            const ws = workbook.addWorksheet(`입고요청서_${i + 1}`);
            
            // 기존 엑셀 출력 로직 재사용
            await generateExcelSheet(ws, data);
        }
        
        const buf = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buf], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}), 
               `입고요청서_${selectedItems.length}건_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
        console.error('엑셀 출력 오류:', error);
        alert('엑셀 출력 중 오류가 발생했습니다.');
    }
}

// 엑셀 시트 생성 (기존 main.js의 로직 재사용)
async function generateExcelSheet(ws, data) {
    const refDept = data.refDept?.join(', ') || '';
    const total = data.items?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
    
    const items = [];
    for(let i = 0; i < 10; i++) {
        const item = data.items?.[i] || {};
        items.push([
            i + 1,
            item.item || "",
            item.spec || "",
            item.unit || "",
            Number(item.qty) || 0,
            Number(item.price) || 0,
            Number(item.amount) || 0,
            item.vendor || "",
            item.cat || "",
            item.wh || "",
            item.note || ""
        ]);
    }
    
    const sheet = [
        ['입고요청서', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''],
        ['요청일자', '', '', '요청번호', '', '', '요청자', '', '', '입고예정일', ''],
        [data.reqDate || '', '', '', data.reqNo || '', '', '', data.reqUser || '', '', '', data.inDate || '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''],
        ['참조부서', '', refDept, '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''],
        ['순번','품명','규격','단위','수량','단가','금액','거래처','카테고리','입고 창고','비고'],
        ...items,
        ['합계', '', '', '', '', '', total, '', '', '', ''],
        ['비고', data.remark || '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''],
        ['거래처 담당자', data.manager || '', '', '거래처 연락처', data.contact || '', '', '', '거래처 이메일', data.email || '', '', ''],
        ['요청자 서명','(서명란)','검토자 서명','(서명란)','승인자 서명','(서명란)','','','','','']
    ];
    
    // 시트에 데이터 입력
    sheet.forEach((row, i) => ws.addRow(row));
    
    // 병합 및 스타일 적용
    ws.mergeCells('A1:K2');
    ws.mergeCells('A3:C3'); ws.mergeCells('D3:F3'); ws.mergeCells('G3:I3'); ws.mergeCells('J3:K3');
    ws.mergeCells('A4:C4'); ws.mergeCells('D4:F4'); ws.mergeCells('G4:I4'); ws.mergeCells('J4:K4');
    ws.mergeCells('A5:K5');
    ws.mergeCells('A6:B6'); ws.mergeCells('C6:K6');
    ws.mergeCells('A7:K7');
    ws.mergeCells('A19:F19');
    ws.mergeCells('A20:A21'); ws.mergeCells('B20:K21');
    ws.mergeCells('A22:K22');
    ws.mergeCells('B23:C23'); ws.mergeCells('E23:G23'); ws.mergeCells('I23:K23');
    ws.mergeCells('G24:K24');
    
    // 스타일 지정
    ws.getRow(1).font = { name: '맑은 고딕', size: 16, bold: true };
    ws.getRow(8).font = { bold: true };
    ws.getRow(15).font = { bold: true };
    
    ws.columns.forEach(col => { col.width = 16; });
    
    // 모든 셀 중앙정렬
    ws.eachRow((row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
    });
    
    // 테두리 적용
    for (let row = 1; row <= 24; row++) {
        for (let col = 1; col <= 11; col++) {
            const cell = ws.getCell(row, col);
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        }
    }
}

// 선택된 항목 인쇄
function printSelected() {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
        alert('인쇄할 항목을 선택해주세요.');
        return;
    }
    
    // 인쇄용 창 생성
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    let printHTML = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <title>입고요청서 인쇄</title>
            <style>
                @page { size: A4 landscape; margin: 5mm; }
                body { font-family: '맑은 고딕', Arial, sans-serif; margin: 0; padding: 0; font-size: 9px; }
                .page-break { page-break-before: always; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
                th, td { border: 1px solid #000; padding: 2px 4px; text-align: center; font-size: 8px; }
                th { background: #f1f1f1; font-weight: bold; }
                .title { font-size: 16px; font-weight: bold; text-align: center; padding: 5px 0; }
                .wide { text-align: left; }
            </style>
        </head>
        <body>
    `;
    
    selectedItems.forEach((data, index) => {
        if (index > 0) {
            printHTML += '<div class="page-break"></div>';
        }
        printHTML += generatePrintHTML(data);
    });
    
    printHTML += '</body></html>';
    
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

// 상세보기
function viewDetails(index) {
    const data = filteredData[index];
    currentViewData = data;
    
    const dialogContent = document.getElementById('viewDialogContent');
    
    // 기본 정보 표시
    dialogContent.innerHTML = `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h4 style="margin-top: 0; color: #495057;">📋 기본 정보</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div><strong>요청일자:</strong> ${data.reqDate || '-'}</div>
                <div><strong>요청번호:</strong> ${data.reqNo || '-'}</div>
                <div><strong>요청자:</strong> ${data.reqUser || '-'}</div>
                <div><strong>입고예정일:</strong> ${data.inDate || '-'}</div>
                <div><strong>참조부서:</strong> ${data.refDept?.join(', ') || '-'}</div>
                <div><strong>저장일시:</strong> ${new Date(data.savedAt).toLocaleString('ko-KR')}</div>
            </div>
        </div>
        
        <div style="background: #e7f3ff; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h4 style="margin-top: 0; color: #0056b3;">📦 품목 정보</h4>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #0056b3; color: white;">
                            <th style="padding: 10px; border: 1px solid #ddd;">순번</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">품명</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">규격</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">단위</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">수량</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">단가</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">금액</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">거래처</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">카테고리</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">입고창고</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">비고</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items?.filter(item => item.item?.trim()).map((item, i) => `
                            <tr style="background: ${i % 2 === 0 ? '#f8f9fa' : 'white'};">
                                <td style="padding: 8px; border: 1px solid #ddd;">${i + 1}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${item.item || '-'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${item.spec || '-'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${item.unit || '-'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${item.qty || '-'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${item.price ? Number(item.price).toLocaleString() : '-'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${item.amount ? Number(item.amount).toLocaleString() : '-'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${item.vendor || '-'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${item.cat || '-'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${item.wh || '-'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${item.note || '-'}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="11" style="padding: 20px; text-align: center; color: #6c757d;">등록된 품목이 없습니다.</td></tr>'}
                        <tr style="background: #e9ecef; font-weight: bold;">
                            <td colspan="6" style="padding: 10px; border: 1px solid #ddd; text-align: right;">합계</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${(data.items?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0).toLocaleString()}원</td>
                            <td colspan="4" style="padding: 10px; border: 1px solid #ddd;"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h4 style="margin-top: 0; color: #856404;">💼 거래처 정보</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div><strong>담당자:</strong> ${data.manager || '-'}</div>
                <div><strong>연락처:</strong> ${data.contact || '-'}</div>
                <div><strong>이메일:</strong> ${data.email || '-'}</div>
            </div>
        </div>
        
        ${data.remark ? `
        <div style="background: #d1ecf1; padding: 20px; border-radius: 10px;">
            <h4 style="margin-top: 0; color: #0c5460;">📝 비고</h4>
            <p style="margin: 0; line-height: 1.6;">${data.remark}</p>
        </div>
        ` : ''}
    `;
    
    document.getElementById('viewDialog').style.display = 'flex';
}

// 상세보기 다이얼로그 닫기
function closeViewDialog() {
    document.getElementById('viewDialog').style.display = 'none';
    currentViewData = null;
}

// 단일 항목 엑셀 출력
async function exportSingleToExcel() {
    if (!currentViewData) return;
    
    try {
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('입고요청서');
        
        await generateExcelSheet(ws, currentViewData);
        
        const buf = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buf], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}), 
               `입고요청서_${currentViewData.reqNo || 'Unknown'}.xlsx`);
    } catch (error) {
        console.error('엑셀 출력 오류:', error);
        alert('엑셀 출력 중 오류가 발생했습니다.');
    }
}

// 단일 항목 인쇄
function printSingle() {
    if (!currentViewData) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    const printHTML = generatePrintHTML(currentViewData);
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <title>입고요청서</title>
            <style>
                @page { size: A4 landscape; margin: 5mm; }
                body { font-family: '맑은 고딕', Arial, sans-serif; margin: 0; padding: 0; font-size: 9px; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 2px; }
                th, td { border: 1px solid #000; padding: 1px 2px; text-align: center; font-size: 8px; }
                th { background: #f1f1f1; font-weight: bold; }
                .title { font-size: 16px; font-weight: bold; text-align: center; padding: 5px 0; }
                .wide { text-align: left; }
            </style>
        </head>
        <body>
            ${printHTML}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

// 인쇄용 HTML 생성 (기존 main.js의 generatePrintHTML 함수 재사용)
function generatePrintHTML(data) {
    const items = [];
    for(let i = 0; i < 10; i++) {
        const item = data.items?.[i] || {};
        items.push({
            no: i + 1,
            item: item.item || '',
            spec: item.spec || '',
            unit: item.unit || '',
            qty: item.qty || '',
            price: item.price || '',
            amount: item.amount || '',
            vendor: item.vendor || '',
            cat: item.cat || '',
            wh: item.wh || '',
            note: item.note || ''
        });
    }
    
    let itemRows = '';
    items.forEach(item => {
        itemRows += `
            <tr>
                <td>${item.no}</td>
                <td>${item.item}</td>
                <td>${item.spec}</td>
                <td>${item.unit}</td>
                <td>${item.qty}</td>
                <td>${item.price}</td>
                <td>${item.amount}</td>
                <td>${item.vendor}</td>
                <td>${item.cat}</td>
                <td>${item.wh}</td>
                <td>${item.note}</td>
            </tr>
        `;
    });
    
    const total = data.items?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
    
    return `
        <div class="title">입고요청서</div>
        
        <table>
            <tr>
                <th>요청일자</th>
                <td>${data.reqDate || ''}</td>
                <th>요청번호</th>
                <td>${data.reqNo || ''}</td>
                <th>요청자</th>
                <td>${data.reqUser || ''}</td>
                <th>입고 예정일</th>
                <td>${data.inDate || ''}</td>
            </tr>
            <tr>
                <th>참조부서</th>
                <td colspan="7" class="wide">${data.refDept?.join(', ') || ''}</td>
            </tr>
        </table>
        
        <table>
            <tr>
                <th>순번</th><th>품명</th><th>규격</th><th>단위</th><th>수량</th><th>단가</th><th>금액</th><th>거래처</th><th>카테고리</th><th>입고 창고</th><th>비고</th>
            </tr>
            ${itemRows}
            <tr>
                <td colspan="6" style="text-align:right;font-weight:bold;">합계</td>
                <td style="font-weight:bold;">${total.toLocaleString()}</td>
                <td colspan="4"></td>
            </tr>
        </table>
        
        <table>
            <tr>
                <th>비고</th>
                <td colspan="10" class="wide">${data.remark || ''}</td>
            </tr>
        </table>
        
        <table>
            <tr>
                <th>거래처 담당자</th>
                <td>${data.manager || ''}</td>
                <th>거래처 연락처</th>
                <td>${data.contact || ''}</td>
                <th>거래처 이메일</th>
                <td colspan="2">${data.email || ''}</td>
            </tr>
        </table>
        
        <table>
            <tr>
                <th>요청자 서명</th>
                <td colspan="2">(서명란)</td>
                <th>검토자 서명</th>
                <td colspan="2">(서명란)</td>
                <th>승인자 서명</th>
                <td colspan="2">(서명란)</td>
            </tr>
        </table>
    `;
}

// 항목 삭제
function deleteItem(savedName) {
    if (confirm('정말 이 입고요청서를 삭제하시겠습니까?')) {
        const savedDataList = JSON.parse(localStorage.getItem('입고요청서_저장목록') || '{}');
        delete savedDataList[savedName];
        localStorage.setItem('입고요청서_저장목록', JSON.stringify(savedDataList));
        
        // 데이터 다시 로드 및 검색
        loadData();
        searchData();
        
        alert('삭제되었습니다.');
    }
}
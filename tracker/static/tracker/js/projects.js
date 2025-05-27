// Project data array
let projects = [];
let currentEditId = null;
let currentProjectId = null;

// Fungsi ambil CSRF Token dari cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const addProjectBtn = document.getElementById('addProjectBtn');
    const projectModal = document.getElementById('projectModal');
    const closeModal = document.getElementById('closeModal');
    const projectForm = document.getElementById('projectForm');
    const progressInput = document.getElementById('progress');
    const progressValue = document.getElementById('progressValue');
    const projectsTableBody = document.getElementById('projectsTableBody');
    const modalTitle = document.querySelector('#projectModal h3');

    // Ini ambil elemen yg sudah ADA di HTML
    const importProjectBtn = document.getElementById('importProjectBtn');
    const csvFileInput = document.getElementById('csvFileInput');

    // Button to open add project modal
    addProjectBtn.addEventListener('click', () => {
        currentEditId = null;
        modalTitle.textContent = 'Add New Project';
        projectForm.reset();
        progressValue.textContent = '0%';
        projectModal.classList.remove('hidden');
    });

    // Button to close modal
    closeModal.addEventListener('click', () => {
        projectModal.classList.add('hidden');
    });

    // Update progress value label
    progressInput.addEventListener('input', (e) => {
        progressValue.textContent = `${e.target.value}%`;
    });

    // Submit project form
    projectForm.addEventListener('submit', handleFormSubmit);

    // Button to open file picker
    importProjectBtn.addEventListener('click', () => {
        csvFileInput.click(); // langsung klik input file
    });

    // Handle file selection
    csvFileInput.addEventListener('change', handleCsvUpload);

    // Fetch initial project data
    fetchProjects();
    
    // Close weekly modal on outside click
    document.addEventListener('click', (e) => {
        if (e.target.closest('#weeklyModal')) {
            e.target.closest('#weeklyModal').remove();
        }
    });
});

// Fetch projects from server with cache busting
async function fetchProjects() {
    try {
        const response = await fetch(`/api/projects/`, {
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        projects = data;
        renderProjects();
        console.log('Fetched projects:', projects);
    } catch (error) {
        console.error('Failed to fetch projects:', error);
        alert('Gagal memuat data project. Silakan refresh halaman.');
    }
}

// Handle form submit
async function handleFormSubmit(e) {
    e.preventDefault();

    const projectData = {
        name: document.getElementById('projectName').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
        status: document.getElementById('status').value,
        priority: document.getElementById('priority').value,
        progress: parseInt(document.getElementById('progress').value)
    };

    try {
        let url = '/api/projects/';
        let method = 'POST';

        if (currentEditId !== null) {
            url += `${currentEditId}/`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(projectData)
        });

        if (!response.ok) throw new Error('Failed to save project');

        document.getElementById('projectModal').classList.add('hidden');
        document.getElementById('projectForm').reset();
        fetchProjects();
    } catch (error) {
        console.error(error);
        alert('Error submitting project!');
    }
}

// Handle CSV file upload
async function handleCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        alert('No file selected.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const csvData = parseCsv(text);

        for (const projectData of csvData) {
            try {
                await fetch('/api/projects/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify(projectData)
                });
            } catch (error) {
                console.error('Error saving project from CSV:', error);
            }
        }

        fetchProjects(); // Refresh tampilan
        alert('CSV imported successfully!');
    };
    reader.readAsText(file);
}

// Parse CSV text into project objects
function parseCsv(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const projects = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const project = {};

        headers.forEach((header, index) => {
            let value = values[index];
            if (header === 'progress') {
                value = parseInt(value) || 0;
            }
            project[header] = value;
        });

        projects.push({
            name: project.name || '',
            start_date: project.start_date || '',
            end_date: project.end_date || '',
            status: project.status || 'Not Started',
            priority: project.priority || 'Low',
            progress: project.progress || 0
        });
    }

    return projects;
}

// Fungsi untuk render weekly progress
function renderWeeklyProgress(container, weeklyData) {
    container.innerHTML = weeklyData.map(week => `
        <div class="bg-white p-4 rounded-lg shadow">
            <div class="flex justify-between items-center mb-2">
                <h5 class="font-medium">Week ${week.week_number}</h5>
                <div class="flex space-x-2">
                    <button onclick="editWeeklyProgress(${week.id})" class="text-blue-600">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteWeeklyProgress(${week.id})" class="text-red-600">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4 text-sm">
                <div>
                    <label>Progress:</label>
                    <span class="font-medium">${week.progress}%</span>
                </div>
                <div>
                    <label>Status:</label>
                    <span class="${getWeeklyStatusClass(week.status)} px-2 py-1 rounded-full">
                        ${week.status}
                    </span>
                </div>
                <div>
                    <label>Description:</label>
                    <p class="text-gray-600">${week.description}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// Fungsi toggle dropdown
function toggleDropdown(projectId) {
    const detailRow = document.querySelector(`tr[data-weekly="${projectId}"]`);
    detailRow.classList.toggle('hidden');
}

// Render project list to table
function renderProjects() {
    const projectsTableBody = document.getElementById('projectsTableBody');
    projectsTableBody.innerHTML = '';

    projects.forEach(project => {
        // Debug: Cek weekly_progress
        console.log(`Project ${project.id} weekly progress:`, project.weekly_progress);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${project.name}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${formatDate(project.start_date)} - ${formatDate(project.end_date)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(project.status)}">
                    ${project.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityClass(project.priority)}">
                    ${project.priority}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${project.progress}%"></div>
                    </div>
                    <span class="ml-2 text-sm font-medium text-gray-700">${project.progress}%</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="editProject(${project.id})" class="text-blue-600 hover:text-blue-900 mr-3">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="deleteProject(${project.id})" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;

        row.addEventListener('click', (e) => {
            if(!e.target.closest('button')) {
                toggleDropdown(project.id);
            }
        });

        const weeklyRow = document.createElement('tr');
        weeklyRow.className = 'hidden';
        weeklyRow.setAttribute('data-weekly', project.id);
        weeklyRow.innerHTML = `
            <td colspan="6" class="px-6 py-4 bg-gray-50">
                <div class="weekly-progress">
                    <h4 class="font-medium mb-4">Weekly Progress</h4>
                    <div class="space-y-3 weekly-entries" id="weekly-${project.id}"></div>
                    <button onclick="handleAddWeek(${project.id})" class="mt-4 bg-green-600 text-white px-3 py-1 rounded">
                        Add Progress
                    </button>
                </div>
            </td>
        `;

        renderWeeklyProgress(weeklyRow.querySelector('.weekly-entries'), project.weekly_progress);
        projectsTableBody.appendChild(row);
        projectsTableBody.appendChild(weeklyRow);
    });
}

// Fungsi untuk status badge
function getWeeklyStatusClass(status) {
    return status === 'At Risk' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
}

// Edit project
function editProject(id) {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const modalTitle = document.querySelector('#projectModal h3');
    const projectForm = document.getElementById('projectForm');
    const progressValue = document.getElementById('progressValue');

    currentEditId = id;
    modalTitle.textContent = 'Edit Project';

    document.getElementById('projectName').value = project.name;
    document.getElementById('startDate').value = project.start_date;
    document.getElementById('endDate').value = project.end_date;
    document.getElementById('status').value = project.status;
    document.getElementById('priority').value = project.priority;
    document.getElementById('progress').value = project.progress;
    progressValue.textContent = `${project.progress}%`;

    document.getElementById('projectModal').classList.remove('hidden');
}

// Format tanggal
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Get status badge class
function getStatusClass(status) {
    switch (status) {
        case 'Not Started': return 'bg-gray-100 text-gray-800';
        case 'In Progress': return 'bg-blue-100 text-blue-800';
        case 'Completed': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

// Get priority badge class
function getPriorityClass(priority) {
    switch (priority) {
        case 'High': return 'bg-red-100 text-red-800';
        case 'Medium': return 'bg-yellow-100 text-yellow-800';
        case 'Low': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

// Delete project
async function deleteProject(id) {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
        const response = await fetch(`/api/projects/${id}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        if (!response.ok) throw new Error('Failed to delete project');

        fetchProjects();
    } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete the project.');
    }
}

// Handle Add Week
function handleAddWeek(projectId) {
    // Hapus modal sebelumnya jika ada
    const existingModal = document.getElementById('weeklyModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Buat modal HTML
    const modalHtml = `
        <div id="weeklyModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="closeWeeklyModal(event)">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onclick="event.stopPropagation()">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-lg font-medium text-gray-800">Add Weekly Progress</h3>
                    <button onclick="closeWeeklyModal()" class="text-gray-400 hover:text-gray-500">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="weeklyProgressForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Week Number</label>
                        <input type="number" id="weekNumber" name="week_number" class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                        <input type="number" id="weeklyProgress" name="progress" class="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" max="100" required>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select id="weeklyStatus" name="status" class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                            <option value="On Track">On Track</option>
                            <option value="At Risk">At Risk</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea id="weeklyDescription" name="description" class="w-full px-3 py-2 border border-gray-300 rounded-md" rows="4" required></textarea>
                    </div>

                    <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg w-full">
                        Save Progress
                    </button>
                </form>
            </div>
        </div>
    `;

    // Masukkan modal ke dalam body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Tangani submit form
    const weeklyForm = document.getElementById('weeklyProgressForm');
    weeklyForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const weekNumber = parseInt(document.getElementById('weekNumber').value);
        const progress = parseInt(document.getElementById('weeklyProgress').value);
        const status = document.getElementById('weeklyStatus').value;
        const description = document.getElementById('weeklyDescription').value;

        if (isNaN(weekNumber)) {
            alert('Week number harus berupa angka');
            return;
        }
        if (progress < 0 || progress > 100) {
            alert('Progress harus antara 0-100');
            return;
        }

        const weekData = {
            week_number: weekNumber,
            progress: progress,
            status: status,
            description: description
        };

        try {
            const response = await fetch(`/api/projects/${projectId}/weekly-progress/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')  // CSRF token penting
                },
                body: JSON.stringify(weekData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Gagal menyimpan progress');
            }

            alert('Progress berhasil disimpan!');
            closeWeeklyModal();
            await fetchProjects();  // Refresh project list

        } catch (error) {
            console.error(error);
            alert(`Gagal menyimpan progress: ${error.message}`);
        }
    });
}

// Close weekly modal
function closeWeeklyModal(event) {
    if (!event || event.target.id === 'weeklyModal') {
        const modal = document.getElementById('weeklyModal');
        if (modal) modal.remove();
    }
}

// Edit weekly progress
function toggleProjectDetails(projectId) {
    const project = projects.find(p => p.id === projectId);
    let html = '';
    if (project.weekly_progress.length > 0) {
        project.weekly_progress.forEach(wp => {
            html += `<li>Minggu ${wp.week_number}: ${wp.progress}% - ${wp.status} (${wp.description})</li>`;
        });
    } else {
        html = '<li>Belum ada progress mingguan</li>';
    }
    document.getElementById(`details-${projectId}`).innerHTML = html;
}

// Di akhir file projects.js, tambahkan:
window.handleAddWeek = handleAddWeek;
window.editProject = editProject;
window.deleteProject = deleteProject;
window.toggleDropdown = toggleDropdown;
window.closeWeeklyModal = closeWeeklyModal;
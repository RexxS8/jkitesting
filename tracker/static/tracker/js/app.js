let projects = [];
let summary = {};  // To store summary data
let calendar = null;

// Function to fetch both projects and summary from the API
async function fetchProjectsAndSummary() {
    try {
        // Fetch projects data
        const responseProjects = await fetch('/api/projects/', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('userToken') // If using token for authentication
            }
        });

        if (!responseProjects.ok) {
            throw new Error('Network response was not ok');
        }

        projects = await responseProjects.json();

        // Fetch summary data
        const responseSummary = await fetch('/api/projects/', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('userToken') // If using token for authentication
            }
        });

        if (!responseSummary.ok) {
            throw new Error('Network response was not ok');
        }

        summary = await responseSummary.json();

        // After fetching both, update the UI
        renderProjects();
        updateStats();
        renderSummary();  // Render the summary to the page
        renderCalendar(projects); // Render the calendar with projects
        // Re-initialize charts to refresh data
        initCharts();
    } catch (error) {
        console.error('Error fetching projects or summary:', error);
    }
}

// Fungsi renderCalendar
function renderCalendar(projects) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    try {
        if (calendar) calendar.destroy();

        // Parse data dari atribut HTML
        const events = JSON.parse(calendarEl.dataset.projects).map(event => ({
            ...event,
            allDay: true,
            display: 'block',
            backgroundColor: event.color,
            borderColor: event.color
        }));

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            events: events,
            eventContent: function(arg) {
                return {
                    html: `<div class="fc-event-main-frame">
                            <div class="fc-event-title-container">
                                <div class="fc-event-title">${arg.event.title}</div>
                            </div>
                        </div>`
                };
            },
            eventDidMount: function(arg) {
                arg.el.style.padding = '2px 5px';
                arg.el.style.borderRadius = '4px';
                arg.el.style.fontSize = '0.85em';
            },
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }
        });

        calendar.render();
    } catch (error) {
        console.error('Calendar error:', error);
    }
}

// Render summary to the page
function renderSummary() {
    if (!summary) return; // Skip if no summary data

    // Display summary in a specific section
    const summaryEl = document.getElementById('projectSummary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <h3>Project Summary</h3>
            <p>Total Projects: ${summary.totalProjects}</p>
            <p>Completed Projects: ${summary.completedProjects}</p>
            <p>In Progress: ${summary.inProgress}</p>
            <p>Overdue Projects: ${summary.overdue}</p>
        `;
    }
}

// Tambahkan ini di bagian atas file setelah deklarasi projects
const progressInput = document.getElementById('progress');
const progressValue = document.getElementById('progressValue');
const projectModal = document.getElementById('projectModal');
const closeModal = document.getElementById('closeModal');
const projectForm = document.getElementById('projectForm');
const projectsTableBody = document.querySelector('#projectsTable tbody');
const totalProjectsEl = document.getElementById('totalProjects');
const inProgressCountEl = document.getElementById('inProgressCount');
const completedCountEl = document.getElementById('completedCount');
const overdueCountEl = document.getElementById('overdueCount');

// Initialize the application after the page is loaded
document.addEventListener('DOMContentLoaded', function () {
    if (isUserLoggedIn()) {
        fetchProjectsAndSummary();
    } else {
        console.log('User is not logged in.');
    }

    // Inisialisasi kalender jika ada data dari atribut HTML
    const calendarEl = document.getElementById('calendar');
    if (calendarEl) {
        try {
            const projectsData = JSON.parse(calendarEl.dataset.projects);
            renderCalendar(projectsData);
        } catch (error) {
            console.error('Error parsing projects:', error);
            renderCalendar([]); // Fallback ke kalender kosong
        }
    }

    // Event listener untuk close modal
    if (closeModal && projectModal && projectForm) {
        closeModal.addEventListener('click', () => {
            projectModal.classList.add('hidden');
            projectForm.reset();
            delete projectForm.dataset.editId;
        });
    }

    // Event listener untuk input progress bar
    if (progressInput && progressValue) {
        progressInput.addEventListener('input', (e) => {
            progressValue.textContent = `${e.target.value}%`;
        });
    }

    // Submit project form
    if (projectForm) {
        projectForm.addEventListener('submit', handleFormSubmit);
    }

    initCharts(); // Initialize charts after all DOM elements are ready
});

// Check if user is logged in (check session or token)
function isUserLoggedIn() {
    const userToken = localStorage.getItem('userToken');
    return userToken !== null;
}

// Render projects to the table
function renderProjects() {
    if (!projectsTableBody) return;

    projectsTableBody.innerHTML = '';

    projects.forEach(project => {
        const row = document.createElement('tr');

        // Calculate if the project is overdue
        const today = new Date();
        const endDate = new Date(project.end_date);
        const isOverdue = today > endDate && project.status !== 'Completed';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${project.name}</div>
                        <div class="text-sm text-gray-500">ID: ${project.id}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${formatDate(project.start_date)} - ${formatDate(project.end_date)}</div>
                <div class="text-sm text-gray-500">${calculateDuration(project.start_date, project.end_date)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(project.status)}">
                    ${project.status}
                </span>
                ${isOverdue ? '<span class="ml-2 text-xs text-red-600">Overdue</span>' : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="${getPriorityClass(project.priority)}">
                    ${getPriorityIcon(project.priority)} ${project.priority}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${project.progress}%"></div>
                </div>
                <div class="text-xs text-gray-500 mt-1">${project.progress}% complete</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-900 mr-2" onclick="editProject(${project.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="text-red-600 hover:text-red-900" onclick="deleteProject(${project.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        projectsTableBody.appendChild(row);
    });
}

// Update statistics
function updateStats() {
    if (!totalProjectsEl) return;

    const today = new Date();

    const totalProjects = projects.length;
    const inProgressCount = projects.filter(p => p.status === 'In Progress').length;
    const completedCount = projects.filter(p => p.status === 'Completed').length;
    const overdueCount = projects.filter(p => {
        const endDate = new Date(p.end_date);
        return today > endDate && p.status !== 'Completed';
    }).length;

    totalProjectsEl.textContent = totalProjects;
    inProgressCountEl.textContent = inProgressCount;
    completedCountEl.textContent = completedCount;
    overdueCountEl.textContent = overdueCount;
}

document.addEventListener('DOMContentLoaded', function() {
    initCharts();  // ini yang aman karena belum ada chart sebelumnya
});

// Refresh charts by removing and recreating them
function refreshCharts() {
    const statusChartEl = document.getElementById('statusChart');
    const progressChartEl = document.getElementById('progressChart');

    if (!statusChartEl || !progressChartEl) return;

    // Periksa apakah chart sudah ada sebelum menghancurkan
    if (window.statusChart instanceof Chart) window.statusChart.destroy(); // <-- Tambahkan pengecekan
    if (window.progressChart instanceof Chart) window.progressChart.destroy(); // <-- Tambahkan pengecekan

    // Initialize charts
    initCharts();
}

// Initialize charts
function initCharts() {
    const statusChartEl = document.getElementById('statusChart');
    const progressChartEl = document.getElementById('progressChart');

    if (!statusChartEl || !progressChartEl) return;

    // Status chart (Pie chart)
    const statusCtx = statusChartEl.getContext('2d');
    window.statusChart = new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#f87171', // red-400 for Not Started
                    '#fbbf24', // amber-400 for In Progress
                    '#34d399', // emerald-400 for Completed
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // Progress chart (Bar chart)
    const progressCtx = progressChartEl.getContext('2d');
    window.progressChart = new Chart(progressCtx, {
        type: 'bar',
        data: {
            labels: progressData.map(p => p.name),
            datasets: [{
                label: 'Progress (%)',
                data: progressData.map(p => p.progress),
                backgroundColor: '#60a5fa', // blue-400
                borderColor: '#2563eb', // blue-600
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Helper functions
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US');
}

function calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days`;
}

function getStatusClass(status) {
    switch (status) {
        case 'Not Started':
            return 'bg-red-400';
        case 'In Progress':
            return 'bg-amber-400';
        case 'Completed':
            return 'bg-green-400';
        default:
            return 'bg-gray-200';
    }
}

function getPriorityClass(priority) {
    switch (priority) {
        case 'High':
            return 'text-red-600';
        case 'Medium':
            return 'text-yellow-600';
        case 'Low':
            return 'text-green-600';
        default:
            return 'text-gray-600';
    }
}

function getPriorityIcon(priority) {
    switch (priority) {
        case 'High':
            return '🔥';
        case 'Medium':
            return '⚠️';
        case 'Low':
            return '✅';
        default:
            return '🔘';
    }
}
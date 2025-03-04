// Initialize IndexedDB
const dbPromise = idb.openDB('CourseManagerDB', 1, {
    upgrade(db) {
        if (!db.objectStoreNames.contains('courses')) {
            db.createObjectStore('courses', { keyPath: 'id' });
        }
    }
});

// Global courses array
let courses = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Load existing data from IndexedDB
    await loadProgress();

    // Update Date and Time
    function updateDateTime() {
        const now = new Date();
        document.getElementById('date').textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        document.getElementById('time').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Add Course
    const addCourseBtn = document.getElementById('addCourseBtn');
    const courseNameInput = document.getElementById('courseName');
    const syllabusSection = document.getElementById('syllabusSection');
    const courseTitle = document.getElementById('courseTitle');
    const chaptersList = document.getElementById('chaptersList');
    const addChapterBtn = document.getElementById('addChapterBtn');
    const chapterNameInput = document.getElementById('chapterName');

    if (addCourseBtn && courseNameInput) {
        console.log('Add Course button and input found');
        addCourseBtn.addEventListener('click', () => {
            console.log('Add Course button clicked');
            const name = courseNameInput.value.trim();
            if (name) {
                console.log('Course name entered:', name);
                createCourse(name);
                courseNameInput.value = '';
            } else {
                console.log('No valid course name provided');
                alert('Please enter a course name.');
            }
        });

        courseNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addCourseBtn.click();
            }
        });
    } else {
        console.error('Add Course button or input not found in DOM');
    }

    // Add Chapter
    if (addChapterBtn && chapterNameInput) {
        addChapterBtn.addEventListener('click', () => {
            console.log('Add Chapter button clicked');
            const name = chapterNameInput.value.trim();
            const courseId = syllabusSection.dataset.courseId;
            if (name && courseId) {
                console.log('Chapter name entered:', name, 'for course:', courseId);
                createChapter(parseInt(courseId), name);
                chapterNameInput.value = '';
            } else {
                console.log('No valid chapter name or course ID provided');
                alert('Please enter a chapter name and select a course.');
            }
        });

        chapterNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addChapterBtn.click();
            }
        });
    }
});

// Save progress to IndexedDB
async function saveProgress() {
    const db = await dbPromise;
    const tx = db.transaction('courses', 'readwrite');
    const store = tx.objectStore('courses');
    await store.clear();
    for (const course of courses) {
        await store.put(course);
    }
    await tx.done;
    console.log('Progress saved to IndexedDB:', courses);
}

// Load progress from IndexedDB
async function loadProgress() {
    const db = await dbPromise;
    const tx = db.transaction('courses', 'readonly');
    const store = tx.objectStore('courses');
    courses = await store.getAll();
    if (courses.length === 0) {
        courses = [];
    } else {
        // Regenerate URLs for attachments
        courses.forEach(course => {
            course.chapters.forEach(chapter => {
                chapter.topics.forEach(topic => {
                    if (topic.attachments) {
                        topic.attachments.forEach(att => {
                            if (att.data) {
                                const blob = new Blob([att.data], { type: att.type });
                                att.url = URL.createObjectURL(blob);
                                att.previewUrl = att.url;
                            }
                        });
                    }
                });
            });
        });
    }
    console.log('Loaded courses from IndexedDB:', courses);
    renderCourses();
}

// Create, Update, Delete Functions for Courses
function createCourse(name) {
    console.log('Creating course with name:', name);
    const now = new Date();
    const creationDateTime = now.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    const course = { id: Date.now(), name, creationDateTime, chapters: [] };
    courses.push(course);
    saveProgress();
    renderCourses();
    console.log('Courses after adding:', courses);
}

function updateCourse(courseId, newName) {
    const course = courses.find(c => c.id === courseId);
    if (course) {
        course.name = newName;
        console.log('Course updated:', course);
        saveProgress();
        renderCourses();
    }
}

function deleteCourse(courseId) {
    courses = courses.filter(c => c.id !== courseId);
    console.log('Course deleted, remaining courses:', courses);
    if (document.getElementById('syllabusSection').dataset.courseId === courseId.toString()) {
        hideSyllabus();
    }
    saveProgress();
    renderCourses();
}

// Create, Update, Delete Functions for Chapters
function createChapter(courseId, name = 'New Chapter') {
    const course = courses.find(c => c.id === courseId);
    if (course) {
        const chapter = { id: Date.now(), name, topics: [] };
        course.chapters.push(chapter);
        console.log('Chapter added to course:', courseId, chapter);
        console.log('Updated course:', course);
        saveProgress();
        renderSyllabus(courseId);
    } else {
        console.error('Course not found for ID:', courseId);
    }
}

function updateChapter(courseId, chapterId, newName) {
    const course = courses.find(c => c.id === courseId);
    if (course) {
        const chapter = course.chapters.find(ch => ch.id === chapterId);
        if (chapter) {
            chapter.name = newName;
            console.log('Chapter updated:', chapter);
            saveProgress();
            renderSyllabus(courseId);
        }
    }
}

function deleteChapter(courseId, chapterId) {
    const course = courses.find(c => c.id === courseId);
    if (course) {
        course.chapters = course.chapters.filter(ch => ch.id !== chapterId);
        console.log('Chapter deleted from course:', courseId, 'remaining chapters:', course.chapters);
        saveProgress();
        renderSyllabus(courseId);
    }
}

// Create, Update, Delete Functions for Topics
function createTopic(courseId, chapterId, name) {
    const course = courses.find(c => c.id === courseId);
    if (course) {
        const chapter = course.chapters.find(ch => ch.id === chapterId);
        if (chapter) {
            if (chapter.topics.length >= 5) {
                console.log('Maximum of 5 topics reached for chapter:', chapterId);
                return;
            }
            const topic = { id: Date.now(), name, completed: false, attachments: [] };
            chapter.topics.push(topic);
            console.log('Topic added to chapter:', chapterId, topic);
            saveProgress();
            renderSyllabus(courseId);
            renderCourses();
            keepChapterExpanded(chapterId);
        }
    }
}

function updateTopic(courseId, chapterId, topicId, newName) {
    const course = courses.find(c => c.id === courseId);
    if (course) {
        const chapter = course.chapters.find(ch => ch.id === chapterId);
        if (chapter) {
            const topic = chapter.topics.find(t => t.id === topicId);
            if (topic) {
                topic.name = newName;
                console.log('Topic updated:', topic);
                saveProgress();
                renderSyllabus(courseId);
                renderCourses();
                keepChapterExpanded(chapterId);
            }
        }
    }
}

function deleteTopic(courseId, chapterId, topicId) {
    const course = courses.find(c => c.id === courseId);
    if (course) {
        const chapter = course.chapters.find(ch => ch.id === chapterId);
        if (chapter) {
            chapter.topics = chapter.topics.filter(t => t.id !== topicId);
            console.log('Topic deleted from chapter:', chapterId, 'remaining topics:', chapter.topics);
            saveProgress();
            renderSyllabus(courseId);
            renderCourses();
            keepChapterExpanded(chapterId);
        }
    }
}

function toggleTopicCompletion(courseId, chapterId, topicId) {
    const course = courses.find(c => c.id === courseId);
    if (course) {
        const chapter = course.chapters.find(ch => ch.id === chapterId);
        if (chapter) {
            const topic = chapter.topics.find(t => t.id === topicId);
            if (topic) {
                topic.completed = !topic.completed;
                console.log(`Topic ${topicId} completion toggled to: ${topic.completed}`);
                saveProgress();
                renderSyllabus(courseId);
                renderCourses();
                keepChapterExpanded(chapterId);
            }
        }
    }
}

function keepChapterExpanded(chapterId) {
    const chapterDiv = document.querySelector(`.chapter-card[data-id="${chapterId}"]`);
    if (chapterDiv) {
        const topics = chapterDiv.querySelector('.topics');
        const expandBtn = chapterDiv.querySelector('.expand-btn');
        if (topics && expandBtn && topics.style.display !== 'block') {
            topics.style.display = 'block';
            expandBtn.className = 'fa fa-chevron-up expand-btn';
            expandBtn.dataset.state = 'expanded';
        }
    }
}

// Calculate Progress
function calculateChapterProgress(chapter) {
    if (chapter.topics.length === 0) return 0;
    const completedTopics = chapter.topics.filter(t => t.completed).length;
    return (completedTopics / chapter.topics.length) * 100;
}

function calculateCourseProgress(course) {
    const nonEmptyChapters = course.chapters.filter(ch => ch.topics.length > 0);
    if (nonEmptyChapters.length === 0) return 0;
    const chapterProgresses = nonEmptyChapters.map(ch => calculateChapterProgress(ch));
    const totalProgress = chapterProgresses.reduce((sum, progress) => sum + progress, 0);
    return totalProgress / nonEmptyChapters.length;
}

function updateProgressCircle(circleElement, percentage) {
    const circumference = 2 * Math.PI * parseFloat(circleElement.getAttribute('r'));
    const offset = circumference - (percentage / 100) * circumference;
    circleElement.style.strokeDasharray = circumference;
    circleElement.style.strokeDashoffset = offset;
}

// Render Courses
function renderCourses() {
    const coursesList = document.getElementById('coursesList');
    coursesList.innerHTML = '';

    if (courses.length === 0) {
        const noCoursesMsg = document.createElement('div');
        noCoursesMsg.className = 'no-courses';
        noCoursesMsg.textContent = 'No courses available';
        coursesList.appendChild(noCoursesMsg);
    } else {
        courses.forEach(course => {
            const courseProgress = calculateCourseProgress(course);
            const courseDiv = document.createElement('div');
            courseDiv.className = 'course-card';
            courseDiv.dataset.id = course.id;

            const isSmallScreen = window.matchMedia("(max-width: 439px)").matches;

            courseDiv.innerHTML = `
                <div class="course-card-content">
                    <div class="course-editable" data-id="${course.id}">
                        <h3><i class="fa fa-plus course-add-chapter" data-id="${course.id}"></i> ${course.name.toUpperCase()}</h3>
                    </div>
                    <span class="course-date">Created: ${course.creationDateTime}</span>
                    <div class="actions">
                        <button class="edit-btn" data-id="${course.id}">Edit</button>
                        <button class="delete-btn" data-id="${course.id}">Delete</button>
                    </div>
                </div>
                <div class="chapter-progress">
                    ${
                        isSmallScreen
                        ? `
                            <div class="progress-text">${courseProgress.toFixed(2)}%</div>
                            <div class="progress-bar">
                                <div class="progress-bar-fill" id="courseProgressBar-${course.id}" style="width: ${courseProgress}%"></div>
                            </div>
                        `
                        : `
                            <svg class="progress-circle" width="80" height="80">
                                <circle class="progress-circle-bg" cx="40" cy="40" r="35" />
                                <circle class="progress-circle-fg" cx="40" cy="40" r="35" id="courseProgressCircle-${course.id}" />
                                <text x="40" y="46" text-anchor="middle" fill="#E2E8F0" font-size="16">${courseProgress.toFixed(2)}%</text>
                            </svg>
                        `
                    }
                </div>
            `;

            courseDiv.addEventListener('click', (e) => {
                if (!e.target.closest('.edit-btn, .delete-btn, .course-add-chapter')) {
                    console.log('Course clicked, showing syllabus for ID:', course.id);
                    showSyllabus(course.id, course.name);
                }
            });

            if (!isSmallScreen) {
                const courseProgressCircle = courseDiv.querySelector(`#courseProgressCircle-${course.id}`);
                updateProgressCircle(courseProgressCircle, courseProgress);
            }

            coursesList.appendChild(courseDiv);
        });
    }

    setupActions();
    console.log('Courses rendered:', courses);
}

// Render Syllabus
function renderSyllabus(courseId) {
    console.log('Rendering syllabus for courseId:', courseId);
    const course = courses.find(c => c.id === courseId);
    if (!course) {
        console.error('Course not found for ID:', courseId);
        return;
    }
    console.log('Found course:', course);

    const courseTitle = document.getElementById('courseTitle');
    const syllabusSection = document.getElementById('syllabusSection');
    const chaptersList = document.getElementById('chaptersList');

    courseTitle.textContent = `Syllabus : ${course.name.toUpperCase()}`;
    syllabusSection.dataset.courseId = course.id;
    chaptersList.innerHTML = '';

    console.log('Course chapters length:', course.chapters.length);
    if (course.chapters.length === 0) {
        const noChaptersMsg = document.createElement('div');
        noChaptersMsg.className = 'no-chapters';
        noChaptersMsg.textContent = 'No chapters available';
        chaptersList.appendChild(noChaptersMsg);
        console.log('No chapters available for course:', courseId);
    } else {
        const isSmallScreen = window.matchMedia("(max-width: 439px)").matches;

        course.chapters.forEach((chapter, index) => {
            const chapterProgress = calculateChapterProgress(chapter);
            const chapterDiv = document.createElement('div');
            chapterDiv.className = 'chapter-card';
            chapterDiv.dataset.id = chapter.id;

            const isMaxTopicsReached = chapter.topics.length >= 5;

            chapterDiv.innerHTML = `
                <div class="chapter-card-header">
                    <div class="chapter-card-content">
                        <div class="chapter-editable" data-course-id="${course.id}" data-id="${chapter.id}">
                            <h4>Chapter ${index + 1} : ${chapter.name} <i class="fa fa-chevron-down expand-btn" data-state="collapsed"></i></h4>
                        </div>
                        <div class="actions">
                            <button class="edit-btn" data-course-id="${course.id}" data-id="${chapter.id}">Edit</button>
                            <button class="delete-btn" data-course-id="${course.id}" data-id="${chapter.id}">Delete</button>
                        </div>
                    </div>
                    <div class="chapter-progress">
                        ${
                            isSmallScreen
                            ? `
                                <div class="progress-text">${chapterProgress.toFixed(2)}%</div>
                                <div class="progress-bar">
                                    <div class="progress-bar-fill" id="chapterProgressBar-${chapter.id}" style="width: ${chapterProgress}%"></div>
                                </div>
                            `
                            : `
                                <svg class="progress-circle" width="80" height="80">
                                    <circle class="progress-circle-bg" cx="40" cy="40" r="35" />
                                    <circle class="progress-circle-fg" cx="40" cy="40" r="35" id="chapterProgressCircle-${chapter.id}" />
                                    <text x="40" y="46" text-anchor="middle" fill="#E2E8F0" font-size="16">${chapterProgress.toFixed(2)}%</text>
                                </svg>
                            `
                        }
                    </div>
                </div>
                <div class="topics"></div>
                <div class="topic-add-container">
                    <input type="text" class="${isMaxTopicsReached ? 'topic-input max-reached' : 'topic-input'}" placeholder="${isMaxTopicsReached ? 'Maximum 5 topics reached' : 'Enter topic name'}" data-course-id="${course.id}" data-chapter-id="${chapter.id}" ${isMaxTopicsReached ? 'disabled' : ''}>
                    <button class="${isMaxTopicsReached ? 'add-topic-btn max-reached-btn' : 'add-topic-btn'}" data-course-id="${course.id}" data-chapter-id="${chapter.id}" ${isMaxTopicsReached ? 'disabled' : ''}>Add Topic</button>
                </div>
            `;

            const topicsDiv = chapterDiv.querySelector('.topics');

            if (!isSmallScreen) {
                const chapterProgressCircle = chapterDiv.querySelector(`#chapterProgressCircle-${chapter.id}`);
                updateProgressCircle(chapterProgressCircle, chapterProgress);
            }

            if (chapter.topics.length === 0) {
                const noTopicsMsg = document.createElement('div');
                noTopicsMsg.className = 'no-topics';
                noTopicsMsg.textContent = 'No topics available';
                topicsDiv.appendChild(noTopicsMsg);
            } else {
                chapter.topics.forEach((topic, index) => {
                    const topicDiv = document.createElement('div');
                    topicDiv.className = 'topic-card';
                    topicDiv.dataset.id = topic.id;

                    let attachmentsHTML = '';
                    if (topic.attachments && topic.attachments.length > 0) {
                        attachmentsHTML = '<h6>Attachments:</h6><ul>';
                        topic.attachments.forEach((att, attIndex) => {
                            attachmentsHTML += `
                                <li>
                                    <a href="${att.url}" target="_blank">${att.name}</a>
                                    <div class="attachment-actions">
                                        <button class="view-file-btn" data-url="${att.previewUrl}">View</button>
                                        <button class="remove-file-btn" data-course-id="${course.id}" data-chapter-id="${chapter.id}" data-topic-id="${topic.id}" data-attachment-index="${attIndex}">Remove</button>
                                    </div>
                                </li>
                            `;
                        });
                        attachmentsHTML += '</ul>';
                    }

                    topicDiv.innerHTML = `
                        <div class="topic-editable" data-course-id="${course.id}" data-chapter-id="${chapter.id}" data-id="${topic.id}">
                            <h5>Topic ${index + 1} : ${topic.name}</h5>
                            ${
                                isSmallScreen
                                ? `
                                    <div class="toggle-row">
                                        <div class="toggle-container">
                                            <label class="toggle-switch">
                                                <input type="checkbox" class="topic-complete-toggle" data-course-id="${course.id}" data-chapter-id="${chapter.id}" data-topic-id="${topic.id}" ${topic.completed ? 'checked' : ''}>
                                                <span class="toggle-slider"></span>
                                            </label>
                                        </div>
                                        <span class="status-label">${topic.completed ? 'Completed' : 'Not Completed'}</span>
                                    </div>
                                `
                                : `
                                    <div class="toggle-container">
                                        <label class="toggle-switch">
                                            <input type="checkbox" class="topic-complete-toggle" data-course-id="${course.id}" data-chapter-id="${chapter.id}" data-topic-id="${topic.id}" ${topic.completed ? 'checked' : ''}>
                                            <span class="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <span class="status-label">${topic.completed ? 'Completed' : 'Not Completed'}</span>
                                `
                            }
                        </div>
                        <div class="topic-attachments">
                            <div class="file-upload-container">
                                <input type="file" class="topic-file-input" data-course-id="${course.id}" data-chapter-id="${chapter.id}" data-topic-id="${topic.id}">
                                <button class="upload-file-btn">Upload</button>
                            </div>
                            <div class="attachments-list">${attachmentsHTML}</div>
                        </div>
                        <div class="actions">
                            <button class="edit-btn topic-edit-btn" data-course-id="${course.id}" data-chapter-id="${chapter.id}" data-id="${topic.id}">Edit</button>
                            <button class="delete-btn topic-delete-btn" data-course-id="${course.id}" data-chapter-id="${chapter.id}" data-id="${topic.id}">Delete</button>
                        </div>
                    `;

                    topicsDiv.appendChild(topicDiv);
                });
            }

            chaptersList.appendChild(chapterDiv);
        });
    }

    syllabusSection.style.display = 'block';
    setupExpandCollapse();
    setupActions();
    setupChapterActions();
    setupTopicActions();
    setupFileViewActions();
    setupRemoveAttachmentActions();
    setupTopicCompletionActions();
    console.log('Syllabus section displayed for course:', courseId);
}

// Open files in new tab
function setupFileViewActions() {
    document.querySelectorAll('.view-file-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fileUrl = e.target.dataset.url;
            if (fileUrl) {
                window.open(fileUrl, '_blank');
            } else {
                alert("Preview URL not available.");
            }
        });
    });
}

// Show Syllabus
function showSyllabus(courseId, courseName) {
    const courseTitle = document.getElementById('courseTitle');
    const syllabusSection = document.getElementById('syllabusSection');
    courseTitle.textContent = `${courseName} Syllabus`;
    syllabusSection.dataset.courseId = courseId;
    renderSyllabus(courseId);
}

// Hide Syllabus
function hideSyllabus() {
    const syllabusSection = document.getElementById('syllabusSection');
    syllabusSection.style.display = 'none';
    syllabusSection.dataset.courseId = '';
    document.getElementById('chaptersList').innerHTML = '';
}

// Expand/Collapse Functionality
function setupExpandCollapse() {
    document.querySelectorAll('.expand-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = btn.closest('.chapter-card');
            const topics = parent.querySelector('.topics');
            const isCollapsed = btn.dataset.state === 'collapsed';
            
            topics.style.display = isCollapsed ? 'block' : 'none';
            btn.className = `fa fa-chevron-${isCollapsed ? 'up' : 'down'} expand-btn`;
            btn.dataset.state = isCollapsed ? 'expanded' : 'collapsed';
            console.log('Expanded/Collapsed topics for chapter:', parent.dataset.id);
        });
    });
}

// Setup Actions (Edit, Delete) for Courses
function setupActions() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (btn.closest('.course-card')) {
                const courseId = parseInt(btn.dataset.id);
                const courseDiv = btn.closest('.course-card');
                const editableDiv = courseDiv.querySelector('.course-editable');
                const currentName = courses.find(c => c.id === courseId)?.name;

                editableDiv.innerHTML = `
                    <input type="text" value="${currentName || ''}" class="course-input">
                    <div class="edit-actions">
                        <i class="fa fa-check done-btn" data-id="${courseId}"></i>
                        <i class="fa fa-times cancel-btn" data-id="${courseId}"></i>
                    </div>
                `;
                setupEditableActions(courseId, editableDiv);
            }
        });
    });

    document.querySelectorAll('.course-card .delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const courseId = parseInt(btn.dataset.id);
            console.log('Course delete button clicked for courseId:', courseId);
            showCourseDeleteModal(courseId);
        });
    });
}

// Setup Editable Actions (Done, Cancel) for Courses
function setupEditableActions(courseId, editableDiv) {
    const input = editableDiv.querySelector('.course-input');
    const doneBtn = editableDiv.querySelector('.done-btn');
    const cancelBtn = editableDiv.querySelector('.cancel-btn');

    doneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newName = input.value.trim();
        if (newName) {
            updateCourse(courseId, newName);
        } else {
            alert('Please enter a valid course name.');
            renderCourses();
        }
    });

    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderCourses();
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            doneBtn.click();
        }
    });

    input.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Show Delete Course Modal
function showCourseDeleteModal(courseId) {
    const modal = document.getElementById('deleteCourseModal');
    const confirmDeleteBtn = document.getElementById('confirmCourseDelete');
    const cancelDeleteBtn = document.getElementById('cancelCourseDelete');

    modal.style.display = 'block';

    confirmDeleteBtn.addEventListener('click', () => {
        deleteCourse(courseId);
        modal.style.display = 'none';
    }, { once: true });

    cancelDeleteBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    }, { once: true });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    }, { once: true });
}

// Show Delete Chapter Modal
function showDeleteChapterModal(courseId, chapterId) {
    const modal = document.getElementById('deleteChapterModal');
    const confirmChapterDeleteBtn = document.getElementById('confirmChapterDelete');
    const cancelChapterDeleteBtn = document.getElementById('cancelChapterDelete');

    modal.style.display = 'block';

    confirmChapterDeleteBtn.addEventListener('click', () => {
        deleteChapter(courseId, chapterId);
        modal.style.display = 'none';
    }, { once: true });

    cancelChapterDeleteBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    }, { once: true });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    }, { once: true });
}

// Show Delete Topic Modal
function showDeleteTopicModal(courseId, chapterId, topicId) {
    const modal = document.getElementById('deleteTopicModal');
    const confirmTopicDeleteBtn = document.getElementById('confirmTopicDelete');
    const cancelTopicDeleteBtn = document.getElementById('cancelTopicDelete');

    modal.style.display = 'block';

    confirmTopicDeleteBtn.addEventListener('click', () => {
        deleteTopic(courseId, chapterId, topicId);
        modal.style.display = 'none';
    }, { once: true });

    cancelTopicDeleteBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    }, { once: true });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    }, { once: true });
}

// Setup Actions (Edit, Delete) for Chapters
function setupChapterActions() {
    document.querySelectorAll('.chapter-card .edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.target.classList.contains('topic-edit-btn')) return;
            const courseId = parseInt(btn.dataset.courseId);
            const chapterId = parseInt(btn.dataset.id);
            const chapterDiv = btn.closest('.chapter-card');
            const editableDiv = chapterDiv.querySelector('.chapter-editable');
            const currentName = courses.find(c => c.id === courseId)?.chapters.find(ch => ch.id === chapterId)?.name;

            editableDiv.innerHTML = `
                <input type="text" value="${currentName}" class="chapter-input">
                <div class="edit-actions">
                    <i class="fa fa-check done-btn" data-course-id="${courseId}" data-id="${chapterId}"></i>
                    <i class="fa fa-times cancel-btn" data-course-id="${courseId}" data-id="${chapterId}"></i>
                </div>
            `;
            setupChapterEditableActions(courseId, chapterId, editableDiv);
        });
    });

    document.querySelectorAll('.chapter-card .delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.target.classList.contains('topic-delete-btn')) return;
            console.log('Chapter delete button clicked for chapterId:', btn.dataset.id);
            const courseId = parseInt(btn.dataset.courseId);
            const chapterId = parseInt(btn.dataset.id);
            showDeleteChapterModal(courseId, chapterId);
        });
    });
}

// Setup Editable Actions (Done, Cancel) for Chapters
function setupChapterEditableActions(courseId, chapterId, editableDiv) {
    const input = editableDiv.querySelector('.chapter-input');
    const doneBtn = editableDiv.querySelector('.done-btn');
    const cancelBtn = editableDiv.querySelector('.cancel-btn');

    doneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newName = input.value.trim();
        if (newName) {
            updateChapter(courseId, chapterId, newName);
        } else {
            alert('Please enter a valid chapter name.');
            renderSyllabus(courseId);
        }
    });

    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderSyllabus(courseId);
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            doneBtn.click();
        }
    });

    input.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Setup Actions (Edit, Delete, Add, Complete) for Topics
function setupTopicActions() {
    document.querySelectorAll('.add-topic-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const courseId = parseInt(btn.dataset.courseId);
            const chapterId = parseInt(btn.dataset.chapterId);
            const input = btn.previousElementSibling;
            const name = input.value.trim();
            if (name) {
                console.log('Topic name entered:', name, 'for chapter:', chapterId, 'in course:', courseId);
                createTopic(courseId, chapterId, name);
                input.value = '';
            } else {
                console.log('No valid topic name provided');
                alert('Please enter a topic name.');
            }
        });
    });

    document.querySelectorAll('.topic-input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !input.disabled) {
                input.nextElementSibling.click();
            }
        });
    });

    document.querySelectorAll('.topic-card .edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const courseId = parseInt(btn.dataset.courseId);
            const chapterId = parseInt(btn.dataset.chapterId);
            const topicId = parseInt(btn.dataset.id);
            const topicDiv = btn.closest('.topic-card');
            const editableDiv = topicDiv.querySelector('.topic-editable');
            const currentName = courses.find(c => c.id === courseId)?.chapters.find(ch => ch.id === chapterId)?.topics.find(t => t.id === topicId)?.name;

            editableDiv.innerHTML = `
                <input type="text" value="${currentName || ''}" class="topic-input">
                <div class="edit-actions">
                    <i class="fa fa-check done-btn" data-course-id="${courseId}" data-chapter-id="${chapterId}" data-id="${topicId}"></i>
                    <i class="fa fa-times cancel-btn" data-course-id="${courseId}" data-chapter-id="${chapterId}" data-id="${topicId}"></i>
                </div>
            `;
            setupTopicEditableActions(courseId, chapterId, topicId, editableDiv);
        });
    });

    document.querySelectorAll('.topic-card .delete-btn.topic-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('Topic delete button clicked for topicId:', btn.dataset.id, 'chapterId:', btn.dataset.chapterId, 'courseId:', btn.dataset.courseId);
            const courseId = parseInt(btn.dataset.courseId);
            const chapterId = parseInt(btn.dataset.chapterId);
            const topicId = parseInt(btn.dataset.id);
            showDeleteTopicModal(courseId, chapterId, topicId);
        });
    });
    
    document.querySelectorAll('.upload-file-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fileInput = btn.previousElementSibling;
            const file = fileInput.files[0];

            if (!file) {
                alert("Please select a file to upload.");
                return;
            }

            const courseId = parseInt(fileInput.dataset.courseId);
            const chapterId = parseInt(fileInput.dataset.chapterId);
            const topicId = parseInt(fileInput.dataset.topicId);

            uploadFile(courseId, chapterId, topicId, file);
        });
    });
}

function setupTopicCompletionActions() {
    document.querySelectorAll('.topic-complete-toggle').forEach(toggle => {
        const statusLabel = toggle.closest('.topic-editable').querySelector('.status-label');
        updateStatusLabel(statusLabel, toggle.checked);
        
        toggle.addEventListener('change', (e) => {
            const courseId = parseInt(toggle.dataset.courseId);
            const chapterId = parseInt(toggle.dataset.chapterId);
            const topicId = parseInt(toggle.dataset.topicId);
            toggleTopicCompletion(courseId, chapterId, topicId);
            updateStatusLabel(statusLabel, toggle.checked);
        });
    });
}

function updateStatusLabel(statusLabel, isCompleted) {
    statusLabel.textContent = isCompleted ? 'Completed' : 'Not Completed';
}

async function uploadFile(courseId, chapterId, topicId, file) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const chapter = course.chapters.find(ch => ch.id === chapterId);
    if (!chapter) return;

    const topic = chapter.topics.find(t => t.id === topicId);
    if (!topic) return;

    if (!topic.attachments) {
        topic.attachments = [];
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const arrayBuffer = event.target.result;
        const blob = new Blob([arrayBuffer], { type: file.type });
        const url = URL.createObjectURL(blob);

        const fileData = {
            name: file.name,
            size: file.size,
            type: file.type,
            data: arrayBuffer,
            url: url,
            previewUrl: url
        };

        topic.attachments.push(fileData);
        console.log("File uploaded:", fileData);

        saveProgress();
        renderSyllabus(courseId);
        renderCourses();
        keepChapterExpanded(chapterId);
    };
    reader.readAsArrayBuffer(file);
}

function setupTopicEditableActions(courseId, chapterId, topicId, editableDiv) {
    const input = editableDiv.querySelector('.topic-input');
    const doneBtn = editableDiv.querySelector('.done-btn');
    const cancelBtn = editableDiv.querySelector('.cancel-btn');
    const chapterIdNum = parseInt(chapterId);
    const isSmallScreen = window.matchMedia("(max-width: 439px)").matches;

    if (isSmallScreen) {
        editableDiv.style.display = 'flex';
        editableDiv.style.flexDirection = 'row';
        editableDiv.style.alignItems = 'center';
        editableDiv.style.width = '100%';
        editableDiv.style.gap = '5px';
    }

    doneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newName = input.value.trim();
        if (newName) {
            updateTopic(courseId, chapterId, topicId, newName);
            keepChapterExpanded(chapterIdNum);
        } else {
            alert('Please enter a valid topic name.');
            renderSyllabus(courseId);
            keepChapterExpanded(chapterIdNum);
        }
    });

    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderSyllabus(courseId);
        keepChapterExpanded(chapterIdNum);
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            doneBtn.click();
        }
    });

    input.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function setupRemoveAttachmentActions() {
    document.querySelectorAll('.remove-file-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const courseId = parseInt(btn.dataset.courseId);
            const chapterId = parseInt(btn.dataset.chapterId);
            const topicId = parseInt(btn.dataset.topicId);
            const attachmentIndex = parseInt(btn.dataset.attachmentIndex);

            removeAttachment(courseId, chapterId, topicId, attachmentIndex);
        });
    });
}

function removeAttachment(courseId, chapterId, topicId, attachmentIndex) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const chapter = course.chapters.find(ch => ch.id === chapterId);
    if (!chapter) return;

    const topic = chapter.topics.find(t => t.id === topicId);
    if (!topic || !topic.attachments) return;

    topic.attachments.splice(attachmentIndex, 1);
    console.log(`Attachment removed from topic ${topicId} at index ${attachmentIndex}`);
    
    saveProgress();
    renderSyllabus(courseId);
    renderCourses();
    keepChapterExpanded(chapterId);
}
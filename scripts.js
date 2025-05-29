document.addEventListener('DOMContentLoaded', function () {
  const taskInput = document.getElementById('new-task-input');
  const addTaskBtn = document.getElementById('add-task-btn');
  const taskList = document.getElementById('task-list');

  // Функция для загрузки задач
  function loadTasks() {
    fetch('api.php/tasks')
      .then((response) => response.json())
      .then((tasks) => {
        renderTasks(tasks);
      })
      .catch((error) => {
        console.error('Ошибка загрузки задач:', error);
      });
  }

  // Функция для отображения задач
  function renderTasks(tasks) {
    taskList.innerHTML = '';
    tasks.forEach((task) => {
      addTaskHTML(task);
    });
  }

  function addTaskHTML(task, isNewTask) {
    const taskItem = createTaskElement(task);
    if (isNewTask) taskItem.classList.add('animated');

    taskList.appendChild(taskItem);

    if (task.subtasks && task.subtasks.length > 0) {
      const subtaskList = document.createElement('ul');
      subtaskList.className = 'subtasks-list';

      task.subtasks.forEach((subtask) => {
        const subtaskItem = createSubtaskElement(subtask);
        subtaskList.appendChild(subtaskItem);
      });

      taskItem.appendChild(subtaskList);
    }
  }

  // Функция для создания элемента задачи
  function createTaskElement(task) {
    const taskItem = document.createElement('li');
    taskItem.className = 'task-item';
    taskItem.dataset.id = task.id;

    const taskHeader = document.createElement('div');
    taskHeader.className = 'task-header';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.is_completed;
    checkbox.addEventListener('change', function () {
      toggleTaskComplete(task.id, checkbox.checked);
    });

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;
    if (task.is_completed) {
      title.classList.add('completed-task');
    }

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const addSubtaskBtn = document.createElement('button');
    addSubtaskBtn.className = 'button add-subtask-button';
    addSubtaskBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4V20M4 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Подзадача
                `;
    addSubtaskBtn.addEventListener('click', function () {
      addSubtask(task.id, true);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'button delete-button';
    deleteBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Удалить
                `;
    deleteBtn.addEventListener('click', function () {
      deleteTask(taskItem, task.id);
    });

    actions.appendChild(addSubtaskBtn);
    actions.appendChild(deleteBtn);

    taskHeader.appendChild(checkbox);
    taskHeader.appendChild(title);
    taskHeader.appendChild(actions);

    taskItem.appendChild(taskHeader);

    return taskItem;
  }

  // Функция для создания элемента подзадачи
  function createSubtaskElement(subtask) {
    const subtaskItem = document.createElement('li');
    subtaskItem.className = 'subtask-item';
    subtaskItem.dataset.id = subtask.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = subtask.is_completed;
    checkbox.addEventListener('change', function () {
      toggleTaskComplete(subtask.id, checkbox.checked);
    });

    const title = document.createElement('span');
    title.className = 'subtask-title';
    title.textContent = subtask.title;
    if (subtask.is_completed) {
      title.classList.add('completed-task');
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'button delete-button';
    deleteBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                `;
    deleteBtn.addEventListener('click', function () {
      deleteTask(subtaskItem, subtask.id);
    });

    subtaskItem.appendChild(checkbox);
    subtaskItem.appendChild(title);
    subtaskItem.appendChild(deleteBtn);

    return subtaskItem;
  }

  // Функция для добавления задачи
  function addTask() {
    const title = taskInput.value.trim();
    if (!title) {
      taskInput.focus();
      return;
    }

    addTaskBtn.style.transform = 'scale(0.95)';
    setTimeout(function () {
      addTaskBtn.style.transform = 'scale(1)';
    }, 200);

    fetch('api.php/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: title }),
    })
      .then((response) => response.json())
      .then(function (task) {
        taskInput.value = '';
        taskInput.focus();
        addTaskHTML(task, true);
      })
      .catch(function (error) {
        console.error('Ошибка добавления задачи:', error);
      });
  }

  // Функция для добавления подзадачи
  function addSubtask(parentId, isNewTask) {
    const title = prompt('Введите название подзадачи:');
    if (!title) return;

    fetch('api.php/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: title, parent_id: parentId }),
    })
      .then((response) => response.json())
      .then(function (res) {
        const parent = document.querySelector("[data-id='" + parentId + "']");
        const subTask = createSubtaskElement(res);
        if (isNewTask) subTask.classList.add('animated');
        if (parent.children.length < 2) {
          const subtaskList = document.createElement('ul');
          subtaskList.className = 'subtasks-list';
          subtaskList.appendChild(subTask);
          parent.appendChild(subtaskList);
          return;
        }

        const subtasksList = parent.querySelector('.subtasks-list');
        subtasksList.appendChild(subTask);
      })
      .catch(function (error) {
        console.error('Ошибка добавления подзадачи:', error);
      });
  }

  // Функция для переключения статуса задачи
  function toggleTaskComplete(taskId, isCompleted) {
    fetch('api.php/tasks/' + taskId, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_completed: isCompleted }),
    })
      .then((response) => response.json())
      .then(function () {
        loadTasks();
      })
      .catch(function (error) {
        console.error('Ошибка обновления задачи:', error);
      });
  }

  // Функция для удаления задачи
  function deleteTask(element, taskId) {
    if (!confirm('Вы уверены, что хотите удалить эту задачу?')) {
      if (element.classList.contains('removing')) {
        element.classList.remove('removing');
      }
      return;
    }
    element.style.animation = 'task-disappear-animation 0.3s ease-in forwards';

    setTimeout(function () {
      element.classList.add('removing');

      fetch('api.php/tasks/' + taskId, {
        method: 'DELETE',
      })
        .then((response) => response.json())
        .then(function () {
          loadTasks();
        })
        .catch(function (error) {
          console.error('Ошибка удаления задачи:', error);
          element.classList.remove('removing');
        });
    }, 300);
  }

  // Обработчики событий
  addTaskBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
      addTask();
    }
  });

  // Загрузка задач при старте
  loadTasks();
});

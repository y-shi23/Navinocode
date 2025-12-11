import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TodoWidget = ({ todos: controlledTodos, onChange }) => {
  const [localTodos, setLocalTodos] = useState(() => {
    const savedTodos = localStorage.getItem('todos');
    return savedTodos ? JSON.parse(savedTodos) : [
      { id: 1, text: 'Hello World', completed: false }
    ];
  });
  const todos = controlledTodos ?? localTodos;
  const setTodos = onChange ?? setLocalTodos;
  const [newTodo, setNewTodo] = useState('');
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef(null);

  // 保存待办事项到本地存储
  useEffect(() => {
    if (!onChange) {
      localStorage.setItem('todos', JSON.stringify(localTodos));
    }
  }, [localTodos, onChange]);

  const addTodo = () => {
    if (newTodo.trim() !== '') {
      setTodos([
        ...todos,
        {
          id: Date.now(),
          text: newTodo,
          completed: false
        }
      ]);
      setNewTodo('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTodo();
      setShowInput(false);
    }
  };

  const handleInputBlur = () => {
    if (newTodo.trim() !== '') {
      addTodo();
    }
    setShowInput(false);
  };

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  return (
    <div className="apple-card rounded-3xl p-4 w-[300px] relative">
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {todos.map((todo) => (
          <div 
            key={todo.id} 
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/20 dark:hover:bg-black/10 transition-colors"
          >
            <button
              onClick={() => toggleTodo(todo.id)}
              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                todo.completed
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
              }`}
              aria-label={todo.completed ? '标记为未完成' : '标记为完成'}
            >
              {todo.completed && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              )}
            </button>
            <span
              className={`flex-grow text-sm text-left ${
                todo.completed
                  ? 'line-through text-gray-500 dark:text-gray-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {todo.text}
            </span>
          </div>
        ))}
      </div>
      
      {showInput ? (
        <div className="flex gap-2 mt-3">
          <Input
            ref={inputRef}
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={handleKeyPress}
            onBlur={handleInputBlur}
            placeholder="添加新任务..."
            className="flex-grow rounded-2xl apple-input text-sm focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      ) : null}
      
      {!showInput && (
        <Button
          onClick={() => setShowInput(true)}
          className="rounded-full w-10 h-10 p-0 apple-button absolute bottom-4 right-4"
          aria-label="添加任务"
        >
          <Plus className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

export default TodoWidget;

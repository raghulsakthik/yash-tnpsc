import React, { useState } from 'react';
import { BookOpen, Plus, Tag, Calendar, Trash2, Search, Check } from 'lucide-react';
import { NoteItem } from '../types';

interface NotesViewProps {
  notes: NoteItem[];
  defaultCourseTitle?: string;
  onAddNote: (note: Omit<NoteItem, 'id' | 'date'>) => void;
  onDeleteNote: (id: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  defaultCourseTitle = '',
  onAddNote,
  onDeleteNote,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCourse, setNewCourse] = useState(defaultCourseTitle);
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');

  const allTags = ['All', ...Array.from(new Set(notes.flatMap((n) => n.tags)))];

  const filteredNotes = notes.filter((n) => {
    if (selectedTag === 'All') return true;
    return n.tags.includes(selectedTag);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    onAddNote({
      title: newTitle.trim(),
      courseTitle: newCourse,
      content: newContent.trim(),
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
    });

    setNewTitle('');
    setNewContent('');
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
              Study Notes
            </h2>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Personal study notebook & key conceptual summaries
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-orange-600 active:scale-98"
        >
          <Plus className="h-4 w-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Tags Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedTag === tag
                ? 'bg-orange-500 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Note Creation Modal */}
      {isCreating && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5 dark:border-orange-900/50 dark:bg-orange-950/20">
          <form onSubmit={handleSubmit} className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Create a New Note
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Note Title (e.g. Heuristic Evaluation Checklist)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
              <input
                type="text"
                placeholder="Course Title"
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
                className="rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
            <textarea
              placeholder="Write your study notes, code rules, or UX heuristics here..."
              rows={3}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              required
              className="w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Tags separated by commas (e.g. Grid, Touch, Mobile)"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-orange-500 focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-orange-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
              >
                Save Note
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800"
          >
            <div>
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="truncate max-w-[180px] font-medium text-orange-600 dark:text-orange-400">
                  {note.courseTitle}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {note.date}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">
                {note.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                {note.content}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
              <div className="flex flex-wrap gap-1.5">
                {note.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    #{t}
                  </span>
                ))}
              </div>

              <button
                onClick={() => onDeleteNote(note.id)}
                className="text-neutral-400 hover:text-red-500 dark:hover:text-red-400"
                title="Delete note"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

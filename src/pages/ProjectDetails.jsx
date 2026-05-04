import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { ref, onValue, push, set, update, remove } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Circle,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  canAssignTask,
  canCreateTask,
  canDeleteTask,
  canEditTaskStatus,
  getAllowedTaskStatuses,
  isAdmin,
} from "../utils/permissions";

// Status helpers

const STATUS_META = {
  TODO: {
    label: "To Do",
    color: "var(--text-muted)",
    bg: "var(--bg-color-tertiary)",
    icon: Circle,
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "var(--warning-color)",
    bg: "rgba(210,153,34,0.12)",
    icon: Clock,
  },
  DONE: {
    label: "Done",
    color: "var(--success-color)",
    bg: "rgba(63,185,80,0.12)",
    icon: CheckCircle,
  },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.TODO;
  const Icon = meta.icon;
  return (
    <span
      className="d-inline-flex align-items-center gap-1 px-3 py-1 rounded-pill small fw-semibold"
      style={{
        background: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.color}33`,
      }}
    >
      <Icon size={13} /> {meta.label}
    </span>
  );
}

function StatusSelect({ task, onUpdate, user }) {
  const allowed = getAllowedTaskStatuses(user);
  const meta = STATUS_META[task.status] || STATUS_META.TODO;

  return (
    <select
      className="form-select form-select-sm border-0 shadow-none fw-semibold"
      value={task.status}
      onChange={(e) => onUpdate(task.id, e.target.value)}
      style={{
        width: 150,
        background: meta.bg,
        color: meta.color,
        cursor: "pointer",
      }}
    >
      {allowed.map((s) => (
        <option key={s} value={s}>
          {STATUS_META[s].label}
        </option>
      ))}
    </select>
  );
}

// Main component

export default function ProjectDetails() {
  const { id } = useParams();
  const { dbUser } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New task form
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState("");

  // Keep mutable refs so listener callbacks always see latest data
  const usersRef = useRef({});
  const projectsRef = useRef({});
  const tasksRef = useRef({});

  // Sync derived state from the three raw data maps
  const sync = () => {
    const usersData = usersRef.current;
    const projectsData = projectsRef.current;
    const tasksData = tasksRef.current;

    // Users list (for assign dropdown)
    const usersList = Object.entries(usersData).map(([uid, u]) => ({
      id: uid,
      ...u,
    }));
    setUsers(usersList);

    // Project
    const projData = projectsData[id];
    if (projData) {
      const manager = usersData[projData.managerId] || { name: "Unknown" };
      setProject({ id, ...projData, manager });
    } else {
      setProject(null);
    }

    // Tasks for this project
    const projectTasks = Object.entries(tasksData)
      .filter(([, t]) => t.projectId === id)
      .map(([tid, t]) => ({
        id: tid,
        ...t,
        assignee: t.assigneeId ? (usersData[t.assigneeId] ?? null) : null,
      }));

    setTasks(projectTasks);
  };

  // Real-time Firebase listeners
  useEffect(() => {
    if (!dbUser) return;

    // Show UI immediately — data populates as listeners respond
    setLoading(false);

    const unsubUsers = onValue(
      ref(db, "users"),
      (snap) => {
        usersRef.current = snap.val() || {};
        sync();
      },
      (err) => {
        console.error("users listener:", err);
        setError("Failed to load users.");
      },
    );

    const unsubProjects = onValue(
      ref(db, "projects"),
      (snap) => {
        projectsRef.current = snap.val() || {};
        sync();
      },
      (err) => {
        console.error("projects listener:", err);
        setError("Failed to load project.");
      },
    );

    const unsubTasks = onValue(
      ref(db, "tasks"),
      (snap) => {
        tasksRef.current = snap.val() || {};
        sync();
      },
      (err) => {
        console.error("tasks listener:", err);
        setError("Failed to load tasks.");
      },
    );

    return () => {
      unsubUsers();
      unsubProjects();
      unsubTasks();
    };
  }, [id, dbUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived helpers
  const canManageTasks = !!(dbUser && canCreateTask(dbUser));
  const assignableUsers = users.filter((u) => u.role === "MEMBER");

  // Handlers
  const createTask = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!canAssignTask(dbUser)) return;
    if (!newTaskTitle.trim()) {
      setFormError("Task title is required.");
      return;
    }
    if (!assigneeId) {
      setFormError("Please select a member to assign.");
      return;
    }

    setIsCreating(true);
    try {
      const newRef = push(ref(db, "tasks"));
      await set(newRef, {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        projectId: id,
        assigneeId,
        status: "TODO",
        createdAt: new Date().toISOString(),
      });
      setNewTaskTitle("");
      setNewTaskDesc("");
      setAssigneeId("");
    } catch (err) {
      console.error("createTask:", err);
      setFormError("Failed to create task. Check your permissions.");
    } finally {
      setIsCreating(false);
    }
  };

  const updateStatus = async (taskId, newStatus) => {
    try {
      await update(ref(db, `tasks/${taskId}`), { status: newStatus });
      // onValue listener will sync the UI automatically; optimistic update is optional
    } catch (err) {
      console.error("updateStatus:", err);
      alert("Failed to update status. You may not have permission.");
    }
  };

  const removeTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    if (!canDeleteTask(dbUser)) return;
    try {
      await remove(ref(db, `tasks/${taskId}`));
    } catch (err) {
      console.error("removeTask:", err);
      alert("Failed to delete task.");
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  // Render guards
  if (loading)
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="container mt-5 text-center">
        <AlertCircle size={40} className="text-danger mb-3" />
        <h4>{error}</h4>
        <Link to="/" className="btn btn-primary mt-3">
          Back to Dashboard
        </Link>
      </div>
    );

  if (!project)
    return (
      <div className="container mt-5 text-center">
        <h3>Project not found.</h3>
        <Link to="/" className="btn btn-primary mt-3">
          Back to Dashboard
        </Link>
      </div>
    );

  // Group tasks by status for a Kanban feel (optional – kept as flat list to match original)
  const todoTasks = tasks.filter((t) => t.status === "TODO");
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = tasks.filter((t) => t.status === "DONE");
  const orderedTasks = [...todoTasks, ...inProgressTasks, ...doneTasks];

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark px-4 py-3 sticky-top">
        <div className="container-fluid">
          <div className="d-flex align-items-center gap-3">
            <Link
              to="/"
              className="btn btn-sm btn-outline-light d-flex align-items-center gap-1 border-0"
            >
              <ArrowLeft size={16} /> Back
            </Link>
            <span className="text-muted d-none d-md-inline">|</span>
            <span className="fw-bold">{project.name}</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small d-none d-md-inline">
              {dbUser.name}
            </span>
            <span
              className="badge ms-1"
              style={{
                background: isAdmin(dbUser)
                  ? "rgba(99,102,241,0.15)"
                  : "rgba(34,197,94,0.15)",
                color: isAdmin(dbUser) ? "#818cf8" : "#4ade80",
                border: `1px solid ${isAdmin(dbUser) ? "#818cf855" : "#4ade8055"}`,
              }}
            >
              {dbUser.role}
            </span>
          </div>
        </div>
      </nav>

      <div className="container-fluid px-4 py-5">
        {/* Project header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <h2 className="fw-bold mb-1">{project.name}</h2>
          {project.description && (
            <p className="text-muted mb-2">{project.description}</p>
          )}
          <small className="text-muted">Manager: {project.manager.name}</small>

          {/* Stats row */}
          <div className="d-flex flex-wrap gap-3 mt-4">
            {[
              { label: "Total", count: tasks.length, color: "#94a3b8" },
              { label: "To Do", count: todoTasks.length, color: "#94a3b8" },
              {
                label: "In Progress",
                count: inProgressTasks.length,
                color: "var(--warning-color)",
              },
              {
                label: "Done",
                count: doneTasks.length,
                color: "var(--success-color)",
              },
            ].map(({ label, count, color }) => (
              <div
                key={label}
                className="px-3 py-2 rounded"
                style={{
                  background: "var(--bg-color-secondary)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div className="fw-bold" style={{ color }}>
                  {count}
                </div>
                <div className="small text-muted">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="row g-4">
          {/* Create task panel (ADMIN only) */}
          {canManageTasks && (
            <div className="col-12 col-lg-3 order-lg-2">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="card border-0 position-sticky"
                style={{ top: "90px" }}
              >
                <div className="card-body p-4">
                  <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                    <Plus size={18} /> New Task
                  </h6>

                  <AnimatePresence>
                    {formError && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="alert alert-danger border-0 py-2 small"
                        style={{
                          background: "rgba(239,68,68,0.15)",
                          color: "#f87171",
                        }}
                      >
                        {formError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={createTask} noValidate>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">
                        TASK TITLE *
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Implement Login"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">
                        DESCRIPTION
                      </label>
                      <textarea
                        className="form-control"
                        placeholder="Add details (optional)"
                        rows={3}
                        value={newTaskDesc}
                        onChange={(e) => setNewTaskDesc(e.target.value)}
                      />
                    </div>

                    <div className="mb-4">
                      <label className="form-label text-muted small fw-bold">
                        ASSIGN TO MEMBER *
                      </label>
                      <select
                        className="form-select"
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        required
                      >
                        <option value="">— Select Member —</option>
                        {assignableUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      {assignableUsers.length === 0 && (
                        <small className="text-warning d-block mt-1">
                          ⚠️ No MEMBER-role users found in Firebase.
                        </small>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-100 py-2 d-flex justify-content-center align-items-center gap-2"
                      disabled={isCreating}
                    >
                      <Plus size={16} />
                      {isCreating ? "Creating…" : "Create Task"}
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}

          {/* Task list */}
          <div
            className={`col-12 ${canManageTasks ? "col-lg-9 order-lg-1" : ""}`}
          >
            <h5 className="text-muted fw-bold mb-4 d-flex align-items-center gap-2">
              TASKS
              <span className="badge bg-secondary rounded-pill">
                {tasks.length}
              </span>
            </h5>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="d-flex flex-column gap-3"
            >
              {orderedTasks.length === 0 ? (
                <div
                  className="card border-0 py-5 text-center"
                  style={{ background: "var(--bg-color-secondary)" }}
                >
                  <div className="text-muted mb-3">
                    <Circle size={48} strokeWidth={1} />
                  </div>
                  <h5 className="text-muted">No tasks yet</h5>
                  {canManageTasks && (
                    <p className="text-muted small">
                      Use the panel on the right to create the first task.
                    </p>
                  )}
                </div>
              ) : (
                orderedTasks.map((task) => {
                  const canEdit = canEditTaskStatus(dbUser, task);

                  return (
                    <motion.div
                      variants={itemVariants}
                      key={task.id}
                      layout
                      className="card border-0 p-4"
                      style={{ background: "var(--bg-color-secondary)" }}
                    >
                      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-4">
                        {/* Left: task info */}
                        <div className="flex-grow-1">
                          <h5 className="fw-bold mb-2">{task.title}</h5>
                          {task.description && (
                            <p
                              className="text-muted mb-3"
                              style={{ lineHeight: 1.6 }}
                            >
                              {task.description}
                            </p>
                          )}
                          <div
                            className="d-inline-flex align-items-center px-2 py-1 rounded small"
                            style={{
                              background: "var(--bg-color-tertiary)",
                              border: "1px solid var(--border-color)",
                            }}
                          >
                            <span className="text-muted">Assignee:</span>
                            <strong className="ms-2">
                              {task.assignee
                                ? task.assignee.name
                                : "Unassigned"}
                            </strong>
                          </div>
                        </div>

                        {/* Right: status control + delete */}
                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                          {canEdit ? (
                            /*
                             * Both ADMIN and MEMBER (for their own tasks) get a full
                             * three-option select: TODO → IN_PROGRESS → DONE
                             */
                            <StatusSelect
                              task={task}
                              onUpdate={updateStatus}
                              user={dbUser}
                            />
                          ) : (
                            /* Read-only badge for tasks not belonging to this member */
                            <StatusBadge status={task.status} />
                          )}

                          {canDeleteTask(dbUser) && (
                            <button
                              className="btn btn-sm btn-outline-danger border-0"
                              onClick={() => removeTask(task.id)}
                              title="Delete Task"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

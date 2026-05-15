"use client";

import { useState } from "react";
import { createUser, updateUserRole, deleteUser } from "./actions";
import type { Role } from "@/lib/auth/roles";

type UserData = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
};

export function UsersClient({
  users,
  currentUserId,
}: {
  users: UserData[];
  currentUserId: string;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<UserData | null>(null);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button className="button button--primary" onClick={() => setIsCreateOpen(true)}>
          + Добавить пользователя
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Email</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Имя</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Роль</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Дата создания</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.2s" }}>
                <td style={{ padding: "12px 16px" }}>{user.email}</td>
                <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{user.name || "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span className={`pill ${user.role === "ADMIN" ? "pill--ready" : "pill--neutral"}`}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                  {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button 
                      className="button button--secondary button--compact" 
                      onClick={() => setIsEditOpen(user)}
                      disabled={user.id === currentUserId}
                    >
                      Редактировать
                    </button>
                    <button
                      className="button button--secondary button--compact"
                      style={{ color: "rgb(255, 99, 132)" }}
                      disabled={user.id === currentUserId}
                      onClick={async () => {
                        if (confirm(`Вы уверены, что хотите удалить пользователя ${user.email}?`)) {
                          try {
                            await deleteUser(user.id);
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                  Нет пользователей
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isCreateOpen && (
        <CreateUserModal onClose={() => setIsCreateOpen(false)} />
      )}

      {isEditOpen && (
        <EditUserModal user={isEditOpen} onClose={() => setIsEditOpen(null)} />
      )}
    </div>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as Role;

    try {
      await createUser({ email, name, password, role });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return <Modal title="Добавить пользователя" onClose={onClose}>
    <form onSubmit={handleSubmit} className="stack">
      {error && <div style={{ color: "rgb(255, 99, 132)", fontSize: "0.84rem" }}>{error}</div>}
      
      <div className="field">
        <label className="field__label">Email</label>
        <input 
          required 
          type="email" 
          name="email"
          autoComplete="off"
          style={{ width: "100%", padding: "8px 12px", background: "var(--background-panel-strong)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
        />
      </div>

      <div className="field">
        <label className="field__label">Имя</label>
        <input 
          required 
          type="text" 
          name="name"
          autoComplete="off"
          style={{ width: "100%", padding: "8px 12px", background: "var(--background-panel-strong)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
        />
      </div>

      <div className="field">
        <label className="field__label">Пароль</label>
        <input 
          required 
          type="password" 
          name="password"
          autoComplete="new-password"
          minLength={8}
          style={{ width: "100%", padding: "8px 12px", background: "var(--background-panel-strong)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
        />
      </div>

      <div className="field">
        <label className="field__label">Роль</label>
        <select 
          required 
          name="role"
          defaultValue="member"
          style={{ width: "100%", padding: "8px 12px", background: "var(--background-panel-strong)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
        >
          <option value="member">Участник (MEMBER)</option>
          <option value="admin">Администратор (ADMIN)</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "16px" }}>
        <button type="button" className="button button--secondary" onClick={onClose} disabled={loading}>
          Отмена
        </button>
        <button type="submit" className="button button--primary" disabled={loading}>
          {loading ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </form>
  </Modal>;
}

function EditUserModal({ user, onClose }: { user: UserData; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const role = formData.get("role") as Role;

    try {
      await updateUserRole(user.id, role);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return <Modal title={`Редактировать ${user.email}`} onClose={onClose}>
    <form onSubmit={handleSubmit} className="stack">
      {error && <div style={{ color: "rgb(255, 99, 132)", fontSize: "0.84rem" }}>{error}</div>}
      
      <div className="field">
        <label className="field__label">Роль</label>
        <select 
          required 
          name="role"
          defaultValue={user.role.toLowerCase()}
          style={{ width: "100%", padding: "8px 12px", background: "var(--background-panel-strong)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
        >
          <option value="member">Участник (MEMBER)</option>
          <option value="admin">Администратор (ADMIN)</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "16px" }}>
        <button type="button" className="button button--secondary" onClick={onClose} disabled={loading}>
          Отмена
        </button>
        <button type="submit" className="button button--primary" disabled={loading}>
          {loading ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </form>
  </Modal>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      backdropFilter: "blur(2px)",
    }}>
      <div style={{
        backgroundColor: "var(--background-panel)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        width: "100%",
        maxWidth: "420px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer", padding: "4px" }}>
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

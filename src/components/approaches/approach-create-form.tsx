import { createApproachAction } from "@/app/(workspace)/approaches/actions";

export function ApproachCreateForm() {
  return (
    <form action={createApproachAction} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input 
        className="auth-input" 
        id="approach-name" 
        name="name" 
        placeholder="Новая воронка..." 
        required 
        type="text" 
        style={{ 
          width: '100%', 
          textAlign: 'center', 
          backgroundColor: 'transparent', 
          border: 'none', 
          borderBottom: '1px solid var(--color-border-subtle)', 
          borderRadius: 0,
          padding: '8px 0',
          outline: 'none'
        }}
      />
      <button className="button button--secondary button--compact" type="submit" style={{ width: '100%' }}>
        Добавить
      </button>
    </form>
  );
}

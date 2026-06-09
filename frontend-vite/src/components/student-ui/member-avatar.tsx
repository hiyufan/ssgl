interface MemberAvatarProps {
  name: string;
  size?: number;
  index?: number;
  role?: string;
}

const COLORS = ['#A78BFA', '#F0A832', '#4ADE80', '#FB923C', '#F87171', '#2DD4BF'];

export function MemberAvatar({ name, size = 36, index = 0, role }: MemberAvatarProps) {
  const color = COLORS[index % COLORS.length];
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `${color}22`,
        border: `2px solid ${color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 700,
        color,
        transition: 'box-shadow 0.3s, border-color 0.3s',
        cursor: 'default',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = `0 0 16px ${color}44`;
          e.currentTarget.style.borderColor = `${color}88`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = `${color}44`;
        }}
      >
        {name[0]?.toUpperCase() || '?'}
      </div>
      {role && (
        <span style={{
          fontSize: 10,
          color: 'var(--s-text-3)',
          fontWeight: 500,
        }}>
          {role}
        </span>
      )}
    </div>
  );
}

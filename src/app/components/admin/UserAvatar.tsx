import React, { useState } from "react";

export function UserAvatar({ name, photoUrl, size = 34 }: { name: string; photoUrl?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  if (photoUrl && !failed) {
    return (
      <img src={photoUrl} alt={name} onError={() => setFailed(true)}
        className="rounded-full flex-shrink-0 object-cover"
        style={{ width: size, height: size }}/>
    );
  }
  return (
    <div className="flex items-center justify-center rounded-full flex-shrink-0 font-bold"
      style={{ width: size, height: size, fontSize: size * 0.37,
        background: "linear-gradient(135deg,#7E6BD8,#5B6EE1)", color: "#fff" }}>
      {initials}
    </div>
  );
}

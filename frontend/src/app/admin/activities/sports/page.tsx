"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StudentPicker } from "@/components/activities/StudentPicker";
import { downloadCsvTemplate } from "@/lib/download";
import { Trophy, Plus, Users, Trash2 } from "lucide-react";

interface Sport {
  id: string;
  name: string;
  category?: string | null;
  coach?: string | null;
  season?: string | null;
  description?: string | null;
  member_count: number;
}

const blank = { name: "", category: "Team", coach: "", season: "", description: "" };

export default function SportsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(blank);
  const [editing, setEditing] = useState<Sport | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [membersFor, setMembersFor] = useState<Sport | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [team, setTeam] = useState("");
  const [position, setPosition] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/activities/sports");
      setSports(res.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(blank);
    setShowForm(true);
  };
  const openEdit = (s: Sport) => {
    setEditing(s);
    setForm({
      name: s.name,
      category: s.category || "Team",
      coach: s.coach || "",
      season: s.season || "",
      description: s.description || "",
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      if (editing) await api.put(`/activities/sports/${editing.id}`, form);
      else await api.post("/activities/sports", form);
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to save sport");
    }
  };

  const remove = async (s: Sport) => {
    if (!confirm(`Delete ${s.name}?`)) return;
    await api.delete(`/activities/sports/${s.id}`);
    load();
  };

  const openMembers = async (s: Sport) => {
    setMembersFor(s);
    const res = await api.get(`/activities/sports/${s.id}/members`);
    setMembers(res.data?.data || []);
  };
  const addMember = async (s: any) => {
    if (!membersFor) return;
    try {
      await api.post(`/activities/sports/${membersFor.id}/members`, {
        student_id: s.id,
        team: team || null,
        position: position || null,
      });
      const res = await api.get(`/activities/sports/${membersFor.id}/members`);
      setMembers(res.data?.data || []);
      load();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Could not add student");
    }
  };
  const removeMember = async (membershipId: string) => {
    if (!membersFor) return;
    await api.delete(`/activities/sports/${membersFor.id}/members/${membershipId}`);
    setMembers((m) => m.filter((x) => x.membership_id !== membershipId));
    load();
  };
  const bulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !membersFor) return;
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post(`/activities/sports/${membersFor.id}/members/bulk`, form);
      alert(res.data?.message || "Imported");
      const r = await api.get(`/activities/sports/${membersFor.id}/members`);
      setMembers(r.data?.data || []);
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Import failed");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div>
      <PageHeader
        title="Sports"
        description="Sports and teams — squads, coaches, and seasons."
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> New Sport
          </Button>
        }
      />

      {loading ? (
        <p className="text-ink-muted">Loading sports…</p>
      ) : sports.length === 0 ? (
        <EmptyState
          icon={<Trophy size={22} />}
          title="No sports yet"
          description="Add sports (e.g. Football, Athletics, Chess) and build their squads."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} /> New Sport
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sports.map((s) => (
            <div
              key={s.id}
              className="bg-surface-card rounded-card border border-border shadow-card p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-ink">{s.name}</h3>
                  <div className="flex gap-1 mt-1">
                    {s.category && <Badge variant="info">{s.category}</Badge>}
                    {s.season && <Badge variant="neutral">{s.season}</Badge>}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
                  <Users size={15} /> {s.member_count}
                </span>
              </div>
              {s.description && (
                <p className="text-sm text-ink-muted mt-2 line-clamp-2">{s.description}</p>
              )}
              {s.coach && <p className="text-xs text-ink-faint mt-2">Coach: {s.coach}</p>}
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="secondary" onClick={() => openMembers(s)}>
                  <Users size={14} /> Squad
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger-text hover:bg-danger-bg"
                  onClick={() => remove(s)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Sport" : "New Sport"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!form.name.trim()}>
              {editing ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label required>Sport name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Football"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Type</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-border-strong rounded-input px-3 py-2 text-sm"
              >
                <option>Team</option>
                <option>Individual</option>
              </select>
            </div>
            <div className="flex-1">
              <Label>Season</Label>
              <Input
                value={form.season}
                onChange={(e) => setForm({ ...form, season: e.target.value })}
                placeholder="Winter"
              />
            </div>
          </div>
          <div>
            <Label>Coach</Label>
            <Input
              value={form.coach}
              onChange={(e) => setForm({ ...form, coach: e.target.value })}
              placeholder="Coach Khan"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!membersFor}
        onClose={() => setMembersFor(null)}
        title={`Squad — ${membersFor?.name || ""}`}
        footer={
          <Button variant="secondary" onClick={() => setMembersFor(null)}>
            Done
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="Team (e.g. U-16 A)"
            />
            <Input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Position"
            />
          </div>
          <StudentPicker onPick={addMember} />
          <div className="flex items-center justify-between gap-2 rounded-input bg-surface px-3 py-2 text-xs text-ink-muted">
            <button
              type="button"
              onClick={() =>
                downloadCsvTemplate(
                  "sport_members_template.csv",
                  ["admission_number", "team", "position"],
                  ["ADM/2024/0001", "U-16 A", "Goalkeeper"]
                )
              }
              className="text-primary-600 hover:underline"
            >
              Download CSV template
            </button>
            <input type="file" accept=".csv" onChange={bulkImport} className="text-xs" />
          </div>
          <div className="border border-border rounded-input divide-y divide-border max-h-60 overflow-auto">
            {members.length === 0 ? (
              <p className="text-sm text-ink-faint p-3">No squad members yet.</p>
            ) : (
              members.map((m) => (
                <div key={m.membership_id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-ink">
                    {m.name} <span className="text-ink-faint">· {m.admission_number || "—"}</span>
                    {m.extra && (
                      <Badge variant="neutral" className="ml-2">
                        {m.extra}
                      </Badge>
                    )}
                  </span>
                  <button
                    onClick={() => removeMember(m.membership_id)}
                    className="text-danger-text hover:bg-danger-bg rounded p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-ink-faint">
            Set team/position above before picking a student (optional).
          </p>
        </div>
      </Modal>
    </div>
  );
}

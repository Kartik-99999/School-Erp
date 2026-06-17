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
import { Sparkles, Plus, Users, Trash2, CalendarDays } from "lucide-react";

interface Club {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  in_charge?: string | null;
  meeting_day?: string | null;
  member_count: number;
}

const blank = { name: "", category: "", in_charge: "", meeting_day: "", description: "" };

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(blank);
  const [editing, setEditing] = useState<Club | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [membersFor, setMembersFor] = useState<Club | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [role, setRole] = useState("Member");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/activities/clubs");
      setClubs(res.data?.data || []);
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
  const openEdit = (c: Club) => {
    setEditing(c);
    setForm({
      name: c.name,
      category: c.category || "",
      in_charge: c.in_charge || "",
      meeting_day: c.meeting_day || "",
      description: c.description || "",
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      if (editing) await api.put(`/activities/clubs/${editing.id}`, form);
      else await api.post("/activities/clubs", form);
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to save club");
    }
  };

  const remove = async (c: Club) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    await api.delete(`/activities/clubs/${c.id}`);
    load();
  };

  const openMembers = async (c: Club) => {
    setMembersFor(c);
    const res = await api.get(`/activities/clubs/${c.id}/members`);
    setMembers(res.data?.data || []);
  };
  const addMember = async (s: any) => {
    if (!membersFor) return;
    try {
      await api.post(`/activities/clubs/${membersFor.id}/members`, { student_id: s.id, role });
      const res = await api.get(`/activities/clubs/${membersFor.id}/members`);
      setMembers(res.data?.data || []);
      load();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Could not add student");
    }
  };
  const removeMember = async (membershipId: string) => {
    if (!membersFor) return;
    await api.delete(`/activities/clubs/${membersFor.id}/members/${membershipId}`);
    setMembers((m) => m.filter((x) => x.membership_id !== membershipId));
    load();
  };
  const bulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !membersFor) return;
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post(`/activities/clubs/${membersFor.id}/members/bulk`, form);
      alert(res.data?.message || "Imported");
      const r = await api.get(`/activities/clubs/${membersFor.id}/members`);
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
        title="Clubs & Societies"
        description="Extracurricular clubs — from Robotics to Debate — and their members."
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> New Club
          </Button>
        }
      />

      {loading ? (
        <p className="text-ink-muted">Loading clubs…</p>
      ) : clubs.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={22} />}
          title="No clubs yet"
          description="Create your first club to let students sign up."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} /> New Club
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {clubs.map((c) => (
            <div
              key={c.id}
              className="bg-surface-card rounded-card border border-border shadow-card p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-ink">{c.name}</h3>
                  {c.category && <Badge variant="info">{c.category}</Badge>}
                </div>
                <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
                  <Users size={15} /> {c.member_count}
                </span>
              </div>
              {c.description && (
                <p className="text-sm text-ink-muted mt-2 line-clamp-2">{c.description}</p>
              )}
              <div className="text-xs text-ink-faint mt-2 space-y-0.5">
                {c.in_charge && <p>In-charge: {c.in_charge}</p>}
                {c.meeting_day && (
                  <p className="inline-flex items-center gap-1">
                    <CalendarDays size={12} /> {c.meeting_day}
                  </p>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="secondary" onClick={() => openMembers(c)}>
                  <Users size={14} /> Members
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger-text hover:bg-danger-bg"
                  onClick={() => remove(c)}
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
        title={editing ? "Edit Club" : "New Club"}
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
            <Label required>Club name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Robotics Club"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Technology"
              />
            </div>
            <div className="flex-1">
              <Label>Meeting day</Label>
              <Input
                value={form.meeting_day}
                onChange={(e) => setForm({ ...form, meeting_day: e.target.value })}
                placeholder="Friday"
              />
            </div>
          </div>
          <div>
            <Label>In-charge (teacher)</Label>
            <Input
              value={form.in_charge}
              onChange={(e) => setForm({ ...form, in_charge: e.target.value })}
              placeholder="Ms. Iyer"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What the club does…"
              rows={3}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!membersFor}
        onClose={() => setMembersFor(null)}
        title={`Members — ${membersFor?.name || ""}`}
        footer={
          <Button variant="secondary" onClick={() => setMembersFor(null)}>
            Done
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="!mb-0">Add as</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="border border-border-strong rounded-input px-2 py-1.5 text-sm"
            >
              <option>Member</option>
              <option>Lead</option>
              <option>President</option>
            </select>
          </div>
          <StudentPicker onPick={addMember} />
          <div className="flex items-center justify-between gap-2 rounded-input bg-surface px-3 py-2 text-xs text-ink-muted">
            <button
              type="button"
              onClick={() =>
                downloadCsvTemplate(
                  "club_members_template.csv",
                  ["admission_number", "role"],
                  ["ADM/2024/0001", "Member"]
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
              <p className="text-sm text-ink-faint p-3">No members yet.</p>
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
        </div>
      </Modal>
    </div>
  );
}

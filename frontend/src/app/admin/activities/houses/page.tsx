"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StudentPicker } from "@/components/activities/StudentPicker";
import { downloadCsvTemplate } from "@/lib/download";
import { Shield, Plus, Trophy, Users, Trash2, Award } from "lucide-react";

interface House {
  id: string;
  name: string;
  color?: string | null;
  motto?: string | null;
  house_master?: string | null;
  points: number;
  member_count: number;
}

const blank = { name: "", color: "#2563eb", motto: "", house_master: "" };

export default function HousesPage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(blank);
  const [editing, setEditing] = useState<House | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pointsFor, setPointsFor] = useState<House | null>(null);
  const [pointsVal, setPointsVal] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const [membersFor, setMembersFor] = useState<House | null>(null);
  const [members, setMembers] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/activities/houses");
      setHouses(res.data?.data || []);
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
  const openEdit = (h: House) => {
    setEditing(h);
    setForm({
      name: h.name,
      color: h.color || "#2563eb",
      motto: h.motto || "",
      house_master: h.house_master || "",
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      if (editing) await api.put(`/activities/houses/${editing.id}`, form);
      else await api.post("/activities/houses", form);
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to save house");
    }
  };

  const remove = async (h: House) => {
    if (!confirm(`Delete ${h.name}? This removes its points and memberships.`)) return;
    await api.delete(`/activities/houses/${h.id}`);
    load();
  };

  const award = async () => {
    const n = parseInt(pointsVal, 10);
    if (!pointsFor || isNaN(n)) return;
    await api.post(`/activities/houses/${pointsFor.id}/points`, {
      points: n,
      reason: pointsReason || null,
    });
    setPointsFor(null);
    setPointsVal("");
    setPointsReason("");
    load();
  };

  const openMembers = async (h: House) => {
    setMembersFor(h);
    const res = await api.get(`/activities/houses/${h.id}/members`);
    setMembers(res.data?.data || []);
  };
  const addMember = async (s: any) => {
    if (!membersFor) return;
    await api.post(`/activities/houses/${membersFor.id}/members`, { student_id: s.id });
    const res = await api.get(`/activities/houses/${membersFor.id}/members`);
    setMembers(res.data?.data || []);
    load();
  };
  const removeMember = async (studentId: string) => {
    if (!membersFor) return;
    await api.delete(`/activities/houses/${membersFor.id}/members/${studentId}`);
    setMembers((m) => m.filter((x) => x.student_id !== studentId));
    load();
  };
  const bulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !membersFor) return;
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post(`/activities/houses/${membersFor.id}/members/bulk`, form);
      alert(res.data?.message || "Imported");
      const r = await api.get(`/activities/houses/${membersFor.id}/members`);
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
        title="Houses"
        description="The house system — assign students, track house points, and crown the winners."
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> New House
          </Button>
        }
      />

      {loading ? (
        <p className="text-ink-muted">Loading houses…</p>
      ) : houses.length === 0 ? (
        <EmptyState
          icon={<Shield size={22} />}
          title="No houses yet"
          description="Create houses (e.g. Red, Blue, Green, Yellow) to get the house system going."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} /> New House
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {houses.map((h) => (
            <div
              key={h.id}
              className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden"
            >
              <div className="h-2" style={{ backgroundColor: h.color || "#2563eb" }} />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-ink text-lg">{h.name}</h3>
                    {h.motto && <p className="text-sm text-ink-muted italic">“{h.motto}”</p>}
                  </div>
                  <span
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center"
                    style={{
                      backgroundColor: (h.color || "#2563eb") + "22",
                      color: h.color || "#2563eb",
                    }}
                  >
                    <Shield size={18} />
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink">
                    <Trophy size={15} className="text-warning-text" /> {h.points} pts
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
                    <Users size={15} /> {h.member_count}
                  </span>
                </div>
                {h.house_master && (
                  <p className="text-xs text-ink-faint mt-2">House Master: {h.house_master}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button size="sm" variant="secondary" onClick={() => setPointsFor(h)}>
                    <Award size={14} /> Points
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openMembers(h)}>
                    <Users size={14} /> Members
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(h)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger-text hover:bg-danger-bg"
                    onClick={() => remove(h)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit House" : "New House"}
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
            <Label required>House name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Red House"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <div>
              <Label>Color</Label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-16 rounded-input border border-border-strong"
              />
            </div>
            <div className="flex-1">
              <Label>House Master</Label>
              <Input
                value={form.house_master}
                onChange={(e) => setForm({ ...form, house_master: e.target.value })}
                placeholder="Mr. Sharma"
              />
            </div>
          </div>
          <div>
            <Label>Motto</Label>
            <Input
              value={form.motto}
              onChange={(e) => setForm({ ...form, motto: e.target.value })}
              placeholder="Courage & Honour"
            />
          </div>
        </div>
      </Modal>

      {/* Award points */}
      <Modal
        open={!!pointsFor}
        onClose={() => setPointsFor(null)}
        title={`Award points — ${pointsFor?.name || ""}`}
        description="Use a negative value to deduct points."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPointsFor(null)}>
              Cancel
            </Button>
            <Button onClick={award} disabled={!pointsVal.trim()}>
              Apply
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label required>Points</Label>
            <Input
              type="number"
              value={pointsVal}
              onChange={(e) => setPointsVal(e.target.value)}
              placeholder="e.g. 10 or -5"
              autoFocus
            />
          </div>
          <div>
            <Label>Reason</Label>
            <Input
              value={pointsReason}
              onChange={(e) => setPointsReason(e.target.value)}
              placeholder="Inter-house quiz win"
            />
          </div>
        </div>
      </Modal>

      {/* Members */}
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
          <StudentPicker onPick={addMember} />
          <div className="flex items-center justify-between gap-2 rounded-input bg-surface px-3 py-2 text-xs text-ink-muted">
            <button
              type="button"
              onClick={() =>
                downloadCsvTemplate(
                  "house_members_template.csv",
                  ["admission_number"],
                  ["ADM/2024/0001"]
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
              <p className="text-sm text-ink-faint p-3">No students assigned yet.</p>
            ) : (
              members.map((m) => (
                <div key={m.membership_id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-ink">
                    {m.name} <span className="text-ink-faint">· {m.admission_number || "—"}</span>
                  </span>
                  <button
                    onClick={() => removeMember(m.student_id)}
                    className="text-danger-text hover:bg-danger-bg rounded p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-ink-faint">
            A student belongs to one house — assigning moves them here.
          </p>
        </div>
      </Modal>
    </div>
  );
}

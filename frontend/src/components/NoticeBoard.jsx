import React, { useState, useEffect } from 'react';
import { Megaphone, Send, MessageSquare, Eye, Clock, AlertTriangle, Plus, X, Trash2, Pencil, CheckCircle } from 'lucide-react';
import API_URL from '../apiConfig';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';

const isWithin48h = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    return (now - created) / (1000 * 60 * 60) <= 48;
};

const canDelete = (hasPermission, user, ann) => {
    if (ann.authorId !== user.id) return false;
    if (hasPermission(PERMISSIONS.ANNOUNCEMENTS_DELETE)) return true;
    return isWithin48h(ann.createdAt);
};

const canEdit = (hasPermission, user, ann) => {
    return hasPermission(PERMISSIONS.ANNOUNCEMENTS_EDIT) && ann.authorId === user.id;
};

const BLANK_FORM = { title: '', content: '', priority: false, expiresAt: '', allowComments: true, type: 'GENERAL' };

const NoticeBoard = () => {
    const { hasPermission, user } = usePermissions();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(BLANK_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [newComment, setNewComment] = useState({});
    const [editTarget, setEditTarget] = useState(null); // { id, formData }
    const [deleteConfirm, setDeleteConfirm] = useState(null); // announcement id
    const [actionError, setActionError] = useState('');
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');

    const fetchAnnouncements = async () => {
        try {
            const bId = selectedBranchId || user.branchId;
            const res = await fetch(`${API_URL}/announcements?branchId=${bId}&userId=${user.id}`);
            const data = await res.json();
            setAnnouncements(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Error fetching announcements:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch(`${API_URL}/branches?userId=${user.id}&role=${user.role}`);
            const data = await res.json();
            setBranches(Array.isArray(data) ? data : []);
        } catch (e) { 
            console.error('Error fetching branches:', e); 
            setBranches([]);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        fetchAnnouncements();
    }, [selectedBranchId, user.id]);

    // ─── Create ─────────────────────────────────────────────────────────────
    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/announcements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, authorId: user.id, userId: user.id, branchId: formData.branchId || user.branchId })
            });
            if (res.ok) {
                setShowForm(false);
                setFormData(BLANK_FORM);
                fetchAnnouncements();
            }
        } catch (e) {
            console.error('Error creating announcement:', e);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Delete ──────────────────────────────────────────────────────────────
    const handleDelete = async (annId) => {
        setActionError('');
        try {
            const res = await fetch(`${API_URL}/announcements/${annId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, role: user.role })
            });
            if (res.ok) {
                setAnnouncements(prev => prev.filter(a => a.id !== annId));
                setDeleteConfirm(null);
            } else {
                const data = await res.json();
                setActionError(data.message || 'Error al eliminar');
            }
        } catch (e) {
            setActionError('Error de conexión');
        }
    };

    // ─── Edit ────────────────────────────────────────────────────────────────
    const openEdit = (ann) => {
        setEditTarget({
            id: ann.id,
            formData: {
                title: ann.title,
                content: ann.content,
                type: ann.type,
                expiresAt: ann.expiresAt ? ann.expiresAt.split('T')[0] : '',
                allowComments: ann.allowComments
            }
        });
        setActionError('');
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setActionError('');
        try {
            const res = await fetch(`${API_URL}/announcements/${editTarget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...editTarget.formData, userId: user.id, role: user.role })
            });
            if (res.ok) {
                setEditTarget(null);
                fetchAnnouncements();
            } else {
                const data = await res.json();
                setActionError(data.message || 'Error al editar');
            }
        } catch (e) {
            setActionError('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Mark read ───────────────────────────────────────────────────────────
    const markAsRead = async (id) => {
        try {
            await fetch(`${API_URL}/announcements/${id}/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
        } catch (e) {
            console.error('Error marking as read:', e);
        }
    };

    // ─── Comment ─────────────────────────────────────────────────────────────
    const handleAddComment = async (announcementId) => {
        const content = newComment[announcementId];
        if (!content?.trim()) return;
        try {
            const res = await fetch(`${API_URL}/announcements/${announcementId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, content })
            });
            if (res.ok) {
                setNewComment(prev => ({ ...prev, [announcementId]: '' }));
                fetchAnnouncements();
            }
        } catch (e) {
            console.error('Error adding comment:', e);
        }
    };

    if (loading) return <div className="p-4 text-center dark:text-gray-400">Cargando anuncios...</div>;

    return (
        <section className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-companyBlue rounded-full"></div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">Tablón de Anuncios</h2>
                    
                    {(user.role === 'admin' || (user.role === 'responsable' && branches.length > 1)) && (
                        <select
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                            className="ml-4 text-xs border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 focus:ring-2 focus:ring-companyBlue focus:border-transparent bg-white dark:bg-gray-900 dark:text-gray-100 shadow-sm outline-none transition-all"
                        >
                            <option value="">Mi Sucursal (Base)</option>
                            {branches.filter(b => b.id !== user.branchId).map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    )}
                </div>
                {hasPermission(PERMISSIONS.ANNOUNCEMENTS_CREATE) && (
                    <button
                        onClick={() => {
                            setFormData({ ...BLANK_FORM, branchId: selectedBranchId || user.branchId });
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-companyBlue hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-sm"
                    >
                        <Plus size={18} />
                        Publicar
                    </button>
                )}
            </div>

            {/* Error Banner */}
            {actionError && (
                <div className="p-4 bg-red-50 dark:bg-slate-800/60 border border-red-200 dark:border-slate-600 rounded-2xl text-red-600 dark:text-red-300 text-sm font-medium flex justify-between items-center">
                    {actionError}
                    <button onClick={() => setActionError('')}><X size={16} /></button>
                </div>
            )}

            {/* Create Modal */}
            {showForm && (
                <AnnouncementModal
                    title="Nuevo Anuncio"
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleCreate}
                    onClose={() => setShowForm(false)}
                    submitting={submitting}
                    user={user}
                    branches={branches}
                    submitLabel="Publicar Anuncio"
                />
            )}

            {/* Edit Modal */}
            {editTarget && (
                <AnnouncementModal
                    title="Editar Anuncio"
                    formData={editTarget.formData}
                    setFormData={(fd) => setEditTarget(prev => ({ ...prev, formData: typeof fd === 'function' ? fd(prev.formData) : fd }))}
                    onSubmit={handleEdit}
                    onClose={() => setEditTarget(null)}
                    submitting={submitting}
                    user={user}
                    branches={branches}
                    submitLabel="Guardar Cambios"
                    error={actionError}
                />
            )}

            {/* Delete Confirm Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm border border-red-200 dark:border-red-800 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex gap-4 mb-4">
                            <div className="p-3 bg-red-100 dark:bg-slate-800/60 text-red-500 rounded-2xl shrink-0">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black dark:text-white">¿Eliminar anuncio?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Esta acción no se puede deshacer. Los comentarios también serán eliminados.</p>
                            </div>
                        </div>
                        {actionError && <p className="text-sm text-red-500 mb-4">{actionError}</p>}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setDeleteConfirm(null); setActionError(''); }}
                                className="flex-1 py-3 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 py-3 text-white bg-red-600 hover:bg-red-700 font-bold rounded-2xl transition-all active:scale-95"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Announcements list */}
            <div className="grid gap-6">
                {announcements.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-10 text-center border border-dashed border-gray-200 dark:border-gray-800">
                        <Megaphone size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 font-bold">No hay anuncios en tu sucursal</p>
                    </div>
                ) : (
                    announcements.map(ann => (
                        <div
                            key={ann.id}
                            className={`group relative bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border transition-all duration-300 hover:shadow-2xl ${ann.priority
                                ? 'border-amber-400/50 dark:border-amber-500/30 ring-4 ring-amber-500/5'
                                : 'border-gray-200 dark:border-gray-800'
                                }`}
                            onMouseEnter={() => !ann.isRead && markAsRead(ann.id)}
                        >
                            {ann.priority && (
                                <div className="absolute top-0 right-0 px-4 py-1 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-xl shadow-lg flex items-center gap-1.5">
                                    <AlertTriangle size={12} />
                                    Prioritario
                                </div>
                            )}

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${ann.type === 'IMPORTANT' ? 'bg-red-100 dark:bg-slate-800/60 text-red-600 dark:text-red-300' :
                                                ann.type === 'SHIFT_CHANGE' ? 'bg-purple-100 dark:bg-slate-800/60 text-purple-600 dark:text-purple-200' :
                                                    ann.type === 'BIRTHDAY' ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300' :
                                                        'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-200'
                                                }`}>
                                                {ann.type === 'GENERAL' ? 'General' : ann.type === 'SHIFT_CHANGE' ? 'Cambio turno' : ann.type === 'BIRTHDAY' ? '🎂 Cumpleaños' : 'Importante'}
                                            </span>
                                            {!ann.isRead && (
                                                <span className="w-2 h-2 bg-companyBlue dark:bg-blue-50 rounded-full animate-pulse"></span>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-black text-gray-800 dark:text-white leading-tight">{ann.title}</h3>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{ann.author.name}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{new Date(ann.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        {/* Action buttons */}
                                        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            {canEdit(hasPermission, user, ann) && (
                                                <button
                                                    onClick={() => openEdit(ann)}
                                                    title="Editar anuncio"
                                                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-50/20 rounded-xl transition-all"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            )}
                                            {canDelete(hasPermission, user, ann) && (
                                                <button
                                                    onClick={() => { setDeleteConfirm(ann.id); setActionError(''); }}
                                                    title={isWithin48h(ann.createdAt) || hasPermission(PERMISSIONS.ANNOUNCEMENTS_DELETE) ? 'Eliminar anuncio' : 'Solo puede eliminarse dentro de las primeras 48h'}
                                                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 bg-gray-50 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mb-4">{ann.content}</p>

                                {/* 48h warning for own announcements */}
                                {ann.authorId === user.id && (user.role === 'employee' || user.role === 'administracion') && (
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isWithin48h(ann.createdAt) ? 'text-amber-500 dark:text-amber-200' : 'text-gray-400 dark:text-gray-600'}`}>
                                        {isWithin48h(ann.createdAt) ? '⏱ Puedes eliminar este anuncio (dentro de 48h)' : '🔒 Período de eliminación expirado'}
                                    </p>
                                )}

                                {ann.allowComments && (
                                    <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                                        <div className="flex items-center gap-2 mb-3 text-gray-500 dark:text-gray-400">
                                            <MessageSquare size={16} />
                                            <span className="text-xs font-bold uppercase tracking-wider">Comentarios ({ann.comments.length})</span>
                                        </div>
                                        <div className="space-y-3 mb-3 max-h-40 overflow-y-auto pr-2">
                                            {ann.comments.map(comm => (
                                                <div key={comm.id} className="bg-gray-50 dark:bg-slate-950/30 p-3 rounded-2xl border border-gray-200 dark:border-gray-800">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-xs font-black text-gray-700 dark:text-gray-200">{comm.user.name}</span>
                                                        <span className="text-[10px] tracking-wider font-bold uppercase text-gray-400">{new Date(comm.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-snug">{comm.content}</p>
                                                </div>
                                            ))}
                                            {ann.comments.length === 0 && !ann.allowComments && (
                                                <p className="text-center text-xs text-gray-400 dark:text-gray-600 py-2 italic">Sin comentarios registrados.</p>
                                            )}
                                        </div>
                                        {ann.allowComments ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Escribe un comentario..."
                                                    value={newComment[ann.id] || ''}
                                                    onChange={e => setNewComment({ ...newComment, [ann.id]: e.target.value })}
                                                    className="flex-1 p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                                                    onKeyDown={e => e.key === 'Enter' && handleAddComment(ann.id)}
                                                />
                                                <button
                                                    onClick={() => handleAddComment(ann.id)}
                                                    className="p-3 bg-companyBlue dark:bg-blue-700 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-800 transition-all flex items-center justify-center"
                                                >
                                                    <Send size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
                                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                                    🔒 Hilo cerrado {ann.type === 'BIRTHDAY' ? '(Fin del cumpleaños)' : ''}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {!ann.allowComments && !ann.type && ( // If comments are disabled for general/important
                                    <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                                        <p className="text-xs text-gray-400 italic">Comentarios desactivados para esta entrada.</p>
                                    </div>
                                )}
                            </div>

                            {/* Stats footer (managers only) */}
                            {hasPermission(PERMISSIONS.ANNOUNCEMENTS_EDIT) && (
                                <div className="px-6 py-3 bg-gray-50 dark:bg-slate-950/20 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                            <Eye size={14} />
                                            <span className="text-[10px] font-bold uppercase">Visto por {ann._count?.reads ?? 0}</span>
                                        </div>
                                        {ann.expiresAt && (
                                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                                <Clock size={14} />
                                                <span className="text-[10px] font-bold uppercase">Expira: {new Date(ann.expiresAt).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className="text-[10px] font-black text-blue-600 dark:text-blue-200 uppercase hover:underline"
                                        onClick={async () => {
                                            const res = await fetch(`${API_URL}/announcements/${ann.id}/stats?role=${user.role}&branchId=${user.branchId}`);
                                            const stats = await res.json();
                                            alert(`Estadísticas:\nLeído por: ${stats.readCount} de ${stats.totalEmployees} empleados (${stats.percentage}%)`);
                                        }}
                                    >
                                        Estadísticas
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </section>
    );
};

// ─── Reusable form modal ──────────────────────────────────────────────────────
const AnnouncementModal = ({ title, formData, setFormData, onSubmit, onClose, submitting, user, branches, submitLabel, error }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-gray-200 dark:border-gray-800 shadow-2xl animate-in zoom-in duration-200 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase tracking-tighter dark:text-white">{title}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
                <input
                    type="text"
                    placeholder="Título"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    required
                />
                
                {(user.role === 'admin' || (user.role === 'responsable' && branches.length > 1)) && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Sucursal de publicación</label>
                        <select
                            value={formData.branchId || user.branchId}
                            onChange={e => setFormData({ ...formData, branchId: parseInt(e.target.value) })}
                            className="w-full p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                            required
                        >
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <textarea
                    placeholder="Escribe el mensaje..."
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full p-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 h-32 dark:text-white"
                    required
                />
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Tipo</label>
                        <select
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                            className="w-full p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                        >
                            <option value="GENERAL">General</option>
                            <option value="SHIFT_CHANGE">Cambio de Turno 🔀</option>
                            <option value="IMPORTANT">Importante ‼️</option>
                            <option value="BIRTHDAY">Cumpleaños 🎂</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Expira (Opcional)</label>
                        <input
                            type="date"
                            value={formData.expiresAt}
                            onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                            className="w-full p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                            required={formData.priority}
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-slate-950/40 rounded-2xl border border-gray-200 dark:border-gray-800">
                    {hasPermission(PERMISSIONS.ANNOUNCEMENTS_EDIT) && (
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Marcar como PRIORITARIO</span>
                        </label>
                    )}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.allowComments}
                            onChange={e => setFormData({ ...formData, allowComments: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Permitir comentarios</span>
                    </label>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-companyBlue hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                >
                    {submitting ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <><CheckCircle size={18} />{submitLabel}</>}
                </button>
            </form>
        </div>
    </div>
);

export default NoticeBoard;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useView } from '../../context/ViewContext';
import styles from './Inventario.module.css';
import ItemTable from './ItemTable';
import CardGrid from './CardGrid';
import type { Item } from '../../types';
import type { Place } from '../../types/PlaceModel';
import { createItem, getItems, setItemStatus, deleteItem, updateItem } from '../../services/ItemServices';
import { getCategories, type Category } from '../../services/CategoryServices';
import { getPlaces } from '../../services/PlaceServices';
import { createReport } from '../../services/ReportServices';
import { getItemHistory, type HistoryItem } from '../../services/HistoryServices';
import { getAllUsers, type UserAccount } from '../../services/UserServices';
import { useAuth } from '../../utils/auth';
import { ReportForm } from '../../components/reports/ReportForm';

export const Inventory: React.FC = () => {
  const {
    viewType,
    searchQuery,
    categoryFilter,
    placeFilter,
    setCategoryOptions,
    setPlaceOptions,
  } = useView();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availablePlaces, setAvailablePlaces] = useState<Place[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemHistory, setItemHistory] = useState<HistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [itemMessage, setItemMessage] = useState('');
  const [adminActionMessage, setAdminActionMessage] = useState('');
  const [adminActionError, setAdminActionError] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isChangingStatusInline, setIsChangingStatusInline] = useState(false);
  const [isFabExpanded, setIsFabExpanded] = useState(false);
  const [editFormData, setEditFormData] = useState({
    itemName: '',
    itemDescription: '',
    cost: '',
    manufacter: '',
    codeBar: '',
    categoryId: '',
    fk_place: '',
  });
  const [newItem, setNewItem] = useState({
    itemName: '',
    itemDescription: '',
    cost: '',
    manufacter: '',
    codeBar: '',
    categoryId: '',
    fk_place: '',
  });

  useEffect(() => {
    getItems().then(setItems);
    getCategories().then(setCategories).catch((error: unknown) => {
      setItemMessage(error instanceof Error ? error.message : 'No se pudieron cargar las categorías.');
    });
    getPlaces().then(setAvailablePlaces).catch((error: unknown) => {
      setItemMessage(error instanceof Error ? error.message : 'No se pudieron cargar los lugares.');
    });
  }, []);

  useEffect(() => {
    if (selectedItem?.itemId) {
      setIsLoadingHistory(true);
      getItemHistory(selectedItem.itemId)
        .then(setItemHistory)
        .finally(() => setIsLoadingHistory(false));
    } else {
      setItemHistory([]);
    }
  }, [selectedItem]);

  const categoryNames = Array.from(new Set(items
    .map((item) => typeof item.category === 'string' ? item.category : item.category?.name)
    .filter((category): category is string => Boolean(category))));
  const places = Array.from(new Set(items.map((item) => item.fk_place?.placeName).filter(Boolean)));
  useEffect(() => {
    setCategoryOptions(categoryNames);
    setPlaceOptions(places);
  }, [items]);
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredItems = items.filter((item) => {
    const searchableText = [
      item.itemName,
      item.itemDescription,
      item.manufacter,
      item.codeBar,
      typeof item.category === 'string' ? item.category : item.category?.name,
      item.fk_place?.placeName,
    ].join(' ').toLocaleLowerCase();
    const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
    const itemCategory = typeof item.category === 'string' ? item.category : item.category?.name;
    const matchesCategory = !categoryFilter || itemCategory === categoryFilter;
    const matchesPlace = !placeFilter || item.fk_place?.placeName === placeFilter;
    return matchesSearch && matchesCategory && matchesPlace;
  });

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isReportOpen) {
          setIsReportOpen(false);
        } else {
          setSelectedItem(null);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isReportOpen]);

  const userRole = typeof currentUser?.fk_role === 'object' && currentUser?.fk_role !== null
    ? Number((currentUser.fk_role as { id: number }).id)
    : Number(currentUser?.fk_role);
  const isAdminOrSuper = Number.isFinite(userRole) && userRole <= 2;
  const isSuperAdmin = userRole === 1;
  const employeeAccounts = Array.from(
    new Map(
      users
        .filter((user) => user.employeeId !== null && user.employeeId !== undefined || user.employee)
        .map((user) => [
          user.userId,
          {
            userId: user.userId,
            label: `${user.firstName} ${user.lastName}`.trim(),
          },
        ])
    ).values()
  );

  useEffect(() => {
    if (!isSuperAdmin) return;
    getAllUsers()
      .then(setUsers)
      .catch((error: unknown) => {
        setReportMessage(error instanceof Error ? error.message : 'No se pudieron cargar las cuentas asignables.');
      });
  }, [isSuperAdmin]);

  const startEditing = () => {
    if (!selectedItem) return;
    const currentCategoryId = typeof selectedItem.category === 'object' && selectedItem.category !== null
      ? String(selectedItem.category.id)
      : '';
    const currentPlaceId = selectedItem.fk_place?.placeId ? String(selectedItem.fk_place.placeId) : '';

    setEditFormData({
      itemName: selectedItem.itemName || '',
      itemDescription: selectedItem.itemDescription || '',
      cost: selectedItem.cost ? String(selectedItem.cost) : '',
      manufacter: selectedItem.manufacter || '',
      codeBar: selectedItem.codeBar || '',
      categoryId: currentCategoryId,
      fk_place: currentPlaceId,
    });
    setAdminActionMessage('');
    setAdminActionError('');
    setIsEditingItem(true);
  };

  const cancelEditing = () => {
    setIsEditingItem(false);
  };

  const saveEditing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsSavingEdit(true);
    setAdminActionMessage('');
    setAdminActionError('');

    try {
      const responsibleId = selectedItem.fk_user_responsible?.employeeId
        ?? selectedItem.fk_user_responsible?.id
        ?? currentUser?.employeeId
        ?? currentUser?.userId;

      if (!responsibleId) {
        throw new Error('No se pudo determinar el responsable asignado.');
      }

      const categoryNum = Number(editFormData.categoryId) || (typeof selectedItem.category === 'object' && selectedItem.category?.id ? selectedItem.category.id : 1);
      const placeNum = Number(editFormData.fk_place) || (selectedItem.fk_place?.placeId ?? 1);

      await updateItem(selectedItem.itemId, {
        itemName: editFormData.itemName,
        itemDescription: editFormData.itemDescription,
        cost: Number(editFormData.cost),
        manufacter: editFormData.manufacter,
        itemStatus: selectedItem.itemStatus,
        codeBar: editFormData.codeBar,
        category: categoryNum,
        fk_user_responsible: Number(responsibleId),
        fk_place: placeNum,
      });

      const matchedCategory = categories.find((c) => c.categoryId === categoryNum);
      const matchedPlace = availablePlaces.find((p) => p.placeId === placeNum);

      const updatedItem: Item = {
        ...selectedItem,
        itemName: editFormData.itemName,
        itemDescription: editFormData.itemDescription,
        cost: Number(editFormData.cost),
        manufacter: editFormData.manufacter,
        codeBar: editFormData.codeBar,
        category: matchedCategory ? { id: matchedCategory.categoryId, name: matchedCategory.categoryName } : selectedItem.category,
        fk_place: matchedPlace || selectedItem.fk_place,
      };

      setSelectedItem(updatedItem);
      setItems((prev) => prev.map((item) => (item.itemId === selectedItem.itemId ? updatedItem : item)));
      setIsEditingItem(false);
      setAdminActionMessage('Activo actualizado con éxito');
      getItemHistory(selectedItem.itemId).then(setItemHistory);
    } catch (err) {
      setAdminActionError(err instanceof Error ? err.message : 'Error al guardar cambios');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleStatusChange = async (newStatus: 'In Use' | 'In Stock' | 'Damaged') => {
    if (!selectedItem || selectedItem.itemStatus === newStatus) return;
    setIsUpdatingStatus(true);
    setAdminActionMessage('');
    setAdminActionError('');
    try {
      await setItemStatus(selectedItem.itemId, newStatus);
      const updatedItem = { ...selectedItem, itemStatus: newStatus };
      setSelectedItem(updatedItem);
      setItems((prev) => prev.map((item) => (item.itemId === selectedItem.itemId ? updatedItem : item)));
      setAdminActionMessage('Estado actualizado con éxito');
      getItemHistory(selectedItem.itemId).then(setItemHistory);
    } catch (err) {
      setAdminActionError(err instanceof Error ? err.message : 'Error al cambiar estado');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    const confirmDelete = window.confirm(`¿Estás seguro de que deseas dar de baja y eliminar el activo "${selectedItem.itemName}" (#${selectedItem.itemId})? Esta acción no se puede deshacer.`);
    if (!confirmDelete) return;

    setIsDeletingItem(true);
    setAdminActionMessage('');
    setAdminActionError('');
    try {
      await deleteItem(selectedItem.itemId);
      setItems((prev) => prev.filter((item) => item.itemId !== selectedItem.itemId));
      setSelectedItem(null);
      setIsFabExpanded(false);
    } catch (err) {
      setAdminActionError(err instanceof Error ? err.message : 'Error al eliminar el activo');
    } finally {
      setIsDeletingItem(false);
    }
  };

  const submitReport = async (payload: Parameters<typeof createReport>[0]) => {
    if (!selectedItem || !currentUser || !payload.name || !payload.description || !payload.fk_item || !payload.dueDate) {
      setReportMessage('Selecciona un artículo, escribe un título/motivo, fecha límite y describe el problema.');
      return;
    }
    setIsSubmittingReport(true);
    setReportMessage('');
    try {
      await createReport(payload);
      setIsReportOpen(false);
      setReportMessage('');
    } catch (submitError) {
      setReportMessage(submitError instanceof Error ? submitError.message : 'No se pudo enviar el reporte.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const closeItemModal = () => {
    if (isSubmittingItem) return;
    setIsItemModalOpen(false);
    setItemMessage('');
    setNewItem({
      itemName: '',
      itemDescription: '',
      cost: '',
      manufacter: '',
      codeBar: '',
      categoryId: '',
      fk_place: '',
    });
  };

  const submitItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) {
      setItemMessage('Necesitas iniciar sesión para crear un artículo.');
      return;
    }
    if (!currentUser.employeeId) {
      setItemMessage('Tu cuenta no está vinculada a un empleado activo.');
      return;
    }

    const placeId = Number(newItem.fk_place);
    const cost = Number(newItem.cost);
    const categoryId = Number(newItem.categoryId);
    if (!Number.isInteger(placeId) || placeId <= 0 || !Number.isFinite(cost) || cost <= 0
      || !Number.isInteger(categoryId) || categoryId <= 0) {
      setItemMessage('El costo, la categoría y el ID del lugar deben ser válidos.');
      return;
    }

    setIsSubmittingItem(true);
    setItemMessage('');
    try {
      await createItem({
        itemName: newItem.itemName.trim(),
        itemDescription: newItem.itemDescription.trim(),
        cost,
        manufacter: newItem.manufacter.trim(),
        codeBar: newItem.codeBar.trim(),
        fk_category: categoryId,
        fk_user_responsible: currentUser.employeeId,
        fk_place: placeId,
      });
      setItems(await getItems());
      setIsItemModalOpen(false);
      setNewItem({
        itemName: '',
        itemDescription: '',
        cost: '',
        manufacter: '',
        codeBar: '',
        categoryId: '',
        fk_place: '',
      });
    } catch (createError) {
      setItemMessage(createError instanceof Error ? createError.message : 'No se pudo crear el artículo.');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const totalItems = items.length;
  const inUseCount = items.filter((item) => item.itemStatus === 'In Use').length;
  const inStockCount = items.filter((item) => item.itemStatus === 'In Stock').length;
  const damagedCount = items.filter((item) => item.itemStatus === 'Damaged').length;

  const inUsePercent = totalItems > 0 ? ((inUseCount / totalItems) * 100).toFixed(1) : '0.0';
  const inStockPercent = totalItems > 0 ? ((inStockCount / totalItems) * 100).toFixed(1) : '0.0';
  const damagedPercent = totalItems > 0 ? ((damagedCount / totalItems) * 100).toFixed(1) : '0.0';

  return (
    <div className={styles.container}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconRed}`}>🪑</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total de Mobiliario</span>
            <span className={styles.statValue}>{totalItems}</span>
            <span className={styles.statSubtext}>Todos los ítems registrados</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>✓</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>En Uso</span>
            <span className={styles.statValue}>{inUseCount}</span>
            <span className={styles.statSubtext}>{inUsePercent}% del total</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconYellow}`}>▣</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>En Bodega</span>
            <span className={styles.statValue}>{inStockCount}</span>
            <span className={styles.statSubtext}>{inStockPercent}% del total</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconWarning}`}>!</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Dañado</span>
            <span className={styles.statValue}>{damagedCount}</span>
            <span className={styles.statSubtext}>{damagedPercent}% del total</span>
          </div>
        </div>
      </div>

      <div className={styles.dataContainer}>
        {viewType === 'tabla' ? (
          <div className={styles.tableSection}>
            <div className={styles.tableToolbar}>
              <span>Inventario</span>
              <button
                className={styles.addItemBtn}
                type="button"
                onClick={() => {
                  setItemMessage('');
                  setIsItemModalOpen(true);
                }}
                aria-label="Agregar artículo de prueba"
                title="Agregar artículo de prueba"
              >
                +
              </button>
            </div>
            <ItemTable items={filteredItems} onSelectItem={setSelectedItem} />
          </div>
        ) : (
          <CardGrid items={filteredItems} onSelectItem={setSelectedItem} />
        )}
      </div>

      {/* Botones Flotantes (Figma Admin Actions Expandible: Base Lápiz) */}
      {isAdminOrSuper && (
        <div className={styles.fabContainer}>
          {/* Si está abierto el modal de agregar, el FAB se convierte en el botón verde de crear sin sub-botones */}
          {isItemModalOpen ? (
            <button
              className={`${styles.fabBtn} ${styles.fabAdd}`}
              type="button"
              title="Formulario de nuevo artículo abierto"
              aria-label="Agregar activo"
              onClick={() => {
                // Al hacer clic sobre el botón de crear estando en el formulario, se puede enfocar o cerrar
                closeItemModal();
              }}
            >
              <svg viewBox="0 0 24 24" className={styles.fabIcon}>
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            </button>
          ) : (
            <>
              {/* Sub-botones desplegados hacia arriba al presionar el Lápiz */}
              <div className={`${styles.fabItemsWrapper} ${isFabExpanded ? styles.fabItemsWrapperOpen : ''}`}>
                  {/* 3.- Botón Verde: Agregar Activo */}
                  <button
                    className={`${styles.fabBtn} ${styles.fabAdd}`}
                    type="button"
                    title="Agregar nuevo activo"
                    aria-label="Agregar activo"
                    onClick={() => {
                      setItemMessage('');
                      setIsItemModalOpen(true);
                      setIsFabExpanded(false);
                    }}
                  >
                    <svg viewBox="0 0 24 24" className={styles.fabIcon}>
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                  </button>

                  {/* 2.- Botón Rojo: Borrar Activo (Superadmin) */}
                  {isSuperAdmin && (
                    <button
                      className={`${styles.fabBtn} ${styles.fabDelete}`}
                      type="button"
                      title={selectedItem ? `Borrar "${selectedItem.itemName}"` : 'Abre o selecciona un activo para borrar'}
                      aria-label="Borrar activo"
                      disabled={!selectedItem || isDeletingItem}
                      onClick={() => {
                        handleDeleteItem();
                        setIsFabExpanded(false);
                      }}
                    >
                      <svg viewBox="0 0 24 24" className={styles.fabIcon}>
                        <path d="M19 13H5v-2h14v2z" />
                      </svg>
                    </button>
                  )}
                </div>

              {/* 1.- Botón Inicial Base: Lápiz (Editar / Expandir) */}
              <button
                className={`${styles.fabBtn} ${styles.fabEdit} ${isFabExpanded ? styles.fabEditActive : ''}`}
                type="button"
                title={
                  isFabExpanded
                    ? selectedItem
                      ? 'Editar activo seleccionado'
                      : 'Cerrar opciones'
                    : 'Opciones de gestión / Editar activo'
                }
                aria-label="Editar o gestionar"
                onClick={() => {
                  if (!isFabExpanded) {
                    setIsFabExpanded(true);
                  } else {
                    if (selectedItem) {
                      startEditing();
                    }
                    setIsFabExpanded(false);
                  }
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`${styles.fabIcon} ${isFabExpanded ? styles.fabIconRotate : ''}`}
                >
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}

      {selectedItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitleGroup}>
                <h2 className={styles.modalTitle}>Detalle de Activo</h2>
                <span className={styles.modalIdBadge}>
                  #{String(selectedItem.itemId).padStart(4, '0')}
                </span>
              </div>
              <button
                className={styles.closeBtn}
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Cerrar detalle"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Columna Izquierda: Datos del Activo (60% - 65%) */}
              <div className={styles.modalLeftColumn}>
                {isEditingItem ? (
                  <form onSubmit={saveEditing} className={styles.detailSection}>
                    <div className={styles.sectionHeader}>
                      <span>✏️ Editar Información</span>
                    </div>
                    <div className={styles.keyValueGrid}>
                      <label htmlFor="editItemName" className={styles.keyLabel}>Nombre:</label>
                      <input
                        id="editItemName"
                        className={styles.editInput}
                        required
                        maxLength={30}
                        value={editFormData.itemName}
                        onChange={(e) => setEditFormData({ ...editFormData, itemName: e.target.value })}
                      />

                      <label htmlFor="editCodeBar" className={styles.keyLabel}>Código:</label>
                      <input
                        id="editCodeBar"
                        className={styles.editInput}
                        maxLength={25}
                        value={editFormData.codeBar}
                        onChange={(e) => setEditFormData({ ...editFormData, codeBar: e.target.value })}
                      />

                      <label htmlFor="editDescription" className={styles.keyLabel}>Descripción:</label>
                      <textarea
                        id="editDescription"
                        className={styles.editTextarea}
                        required
                        maxLength={255}
                        rows={2}
                        value={editFormData.itemDescription}
                        onChange={(e) => setEditFormData({ ...editFormData, itemDescription: e.target.value })}
                      />

                      <label htmlFor="editCategory" className={styles.keyLabel}>Categoría:</label>
                      <select
                        id="editCategory"
                        className={styles.editSelect}
                        required
                        value={editFormData.categoryId}
                        onChange={(e) => setEditFormData({ ...editFormData, categoryId: e.target.value })}
                      >
                        <option value="" disabled>Selecciona una categoría</option>
                        {categories.map((c) => (
                          <option key={c.categoryId} value={c.categoryId}>
                            {c.categoryName}
                          </option>
                        ))}
                      </select>

                      <label htmlFor="editManufacturer" className={styles.keyLabel}>Fabricante:</label>
                      <input
                        id="editManufacturer"
                        className={styles.editInput}
                        required
                        maxLength={25}
                        value={editFormData.manufacter}
                        onChange={(e) => setEditFormData({ ...editFormData, manufacter: e.target.value })}
                      />

                      <label htmlFor="editPlace" className={styles.keyLabel}>Lugar:</label>
                      <select
                        id="editPlace"
                        className={styles.editSelect}
                        required
                        value={editFormData.fk_place}
                        onChange={(e) => setEditFormData({ ...editFormData, fk_place: e.target.value })}
                      >
                        <option value="" disabled>Selecciona un lugar</option>
                        {availablePlaces.map((p) => (
                          <option key={p.placeId} value={p.placeId}>
                            {p.placeLocation} - {p.placeName}
                          </option>
                        ))}
                      </select>

                      <label htmlFor="editCost" className={styles.keyLabel}>Costo ($):</label>
                      <input
                        id="editCost"
                        type="number"
                        min="1"
                        step="1"
                        className={styles.editInput}
                        required
                        value={editFormData.cost}
                        onChange={(e) => setEditFormData({ ...editFormData, cost: e.target.value })}
                      />
                    </div>

                    <div className={styles.editActionsRow}>
                      <button type="submit" className={styles.saveEditBtn} disabled={isSavingEdit}>
                        {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                      <button type="button" className={styles.cancelEditBtn} onClick={cancelEditing}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* Sección 1: Información General */}
                    <div className={styles.detailSection}>
                      <div className={styles.sectionHeader}>
                        <span>Información General</span>
                      </div>
                      <div className={styles.keyValueGrid}>
                        <span className={styles.keyLabel}>Nombre:</span>
                        <span className={styles.valueText}>{selectedItem.itemName || 'N/A'}</span>

                        <span className={styles.keyLabel}>Código:</span>
                        <span className={styles.valueText}>{selectedItem.codeBar || 'Sin código'}</span>

                        <span className={styles.keyLabel}>Descripción:</span>
                        <span className={styles.valueText}>{selectedItem.itemDescription || 'Sin descripción'}</span>

                        <span className={styles.keyLabel}>Categoría:</span>
                        <span className={styles.valueText}>
                          {typeof selectedItem.category === 'string'
                            ? selectedItem.category
                            : selectedItem.category?.name || 'N/A'}
                        </span>

                        <span className={styles.keyLabel}>Fabricante:</span>
                        <span className={styles.valueText}>{selectedItem.manufacter || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Sección 2: Ubicación y Asignación */}
                    <div className={styles.detailSection}>
                      <div className={styles.sectionHeader}>
                        <span>Ubicación y Asignación</span>
                      </div>
                      <div className={styles.keyValueGrid}>
                        <span className={styles.keyLabel}>Estado:</span>
                        <div>
                          {isAdminOrSuper && isChangingStatusInline ? (
                            <select
                              className={styles.inlineStatusSelect}
                              value={selectedItem.itemStatus || ''}
                              autoFocus
                              disabled={isUpdatingStatus}
                              onBlur={() => setIsChangingStatusInline(false)}
                              onChange={(e) => {
                                handleStatusChange(e.target.value as 'In Use' | 'In Stock' | 'Damaged');
                                setIsChangingStatusInline(false);
                              }}
                            >
                              <option value="In Stock">In Stock</option>
                              <option value="In Use">In Use</option>
                              <option value="Damaged">Damaged</option>
                            </select>
                          ) : (
                            <div
                              onClick={() => {
                                if (isAdminOrSuper) setIsChangingStatusInline(true);
                              }}
                              title={isAdminOrSuper ? 'Haz clic para cambiar el estado' : undefined}
                              style={{ display: 'inline-block' }}
                            >
                              {selectedItem.itemStatus === 'In Stock' && (
                                <span className={`${styles.statusBadgeInStock} ${isAdminOrSuper ? styles.statusClickableBadge : ''}`}>
                                  In Stock {isAdminOrSuper && '▾'}
                                </span>
                              )}
                              {selectedItem.itemStatus === 'In Use' && (
                                <span className={`${styles.statusBadgeInUse} ${isAdminOrSuper ? styles.statusClickableBadge : ''}`}>
                                  In Use {isAdminOrSuper && '▾'}
                                </span>
                              )}
                              {selectedItem.itemStatus === 'Damaged' && (
                                <span className={`${styles.statusBadgeDamaged} ${isAdminOrSuper ? styles.statusClickableBadge : ''}`}>
                                  Damaged {isAdminOrSuper && '▾'}
                                </span>
                              )}
                              {!selectedItem.itemStatus && (
                                <span className={`${styles.statusBadge} ${isAdminOrSuper ? styles.statusClickableBadge : ''}`}>
                                  N/A {isAdminOrSuper && '▾'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <span className={styles.keyLabel}>Lugar:</span>
                        <span className={styles.valueText}>
                          {selectedItem.fk_place
                            ? [selectedItem.fk_place.placeLocation, selectedItem.fk_place.placeName].filter(Boolean).join(' - ') || 'No asignado'
                            : 'No asignado'}
                        </span>

                        <span className={styles.keyLabel}>Responsable:</span>
                        <div className={styles.userResponsibleBadge}>
                          <span>
                            {selectedItem.fk_user_responsible
                              ? `${selectedItem.fk_user_responsible.employeeId ?? selectedItem.fk_user_responsible.id} - ${selectedItem.fk_user_responsible.firstName} ${selectedItem.fk_user_responsible.lastName}`
                              : 'No asignado'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sección 3: Valor */}
                    <div className={styles.detailSection}>
                      <div className={styles.sectionHeader}>
                        <span>Valor</span>
                      </div>
                      <div className={styles.keyValueGrid}>
                        <span className={styles.keyLabel}>Costo:</span>
                        <span className={styles.costHighlight}>
                          {typeof selectedItem.cost === 'number'
                            ? `$${selectedItem.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : 'No disponible'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Columna Derecha: Acciones e Historial (35% - 40%) */}
              <div className={styles.modalRightColumn}>
                {/* Bloque de Acciones Superior */}
                <div className={styles.actionsBlock}>
                  {isAdminOrSuper && (
                    <button
                      className={styles.requestPrimaryBtn}
                      type="button"
                      onClick={() => navigate('/Dashboard/solicitudes', { state: { itemId: selectedItem.itemId } })}
                    >
                      <span>Solicitar</span>
                    </button>
                  )}
                  <button
                    className={styles.reportSecondaryBtn}
                    type="button"
                    onClick={() => setIsReportOpen(true)}
                  >
                    <span>Reportar</span>
                  </button>
                </div>

                {/* Bloque de Historial Inferior */}
                <div className={styles.historyContainer}>
                  <h3 className={styles.historyTitle}>
                    <span>Historial de Actividad</span>
                  </h3>

                  {isLoadingHistory ? (
                    <div className={styles.emptyStateHistory}>
                      <span className={styles.emptyStateText}>Cargando historial...</span>
                    </div>
                  ) : itemHistory.length > 0 ? (
                    <ul className={styles.timelineList}>
                      {itemHistory.map((entry) => {
                        const dateFormatted = entry.createdAt
                          ? new Date(entry.createdAt).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Fecha no registrada';

                        return (
                          <li key={entry.historyId} className={styles.timelineItem}>
                            <div className={styles.timelineDot} />
                            <div className={styles.timelineContent}>
                              <span className={styles.timelineHeader}>
                                {entry.historyDescription || entry.action || entry.details || 'Movimiento de inventario'}
                              </span>
                              <span className={styles.timelineDate}>{dateFormatted}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className={styles.emptyStateHistory}>
                      <span className={styles.emptyStateIcon}>📋</span>
                      <p className={styles.emptyStateText}>Sin movimientos recientes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isItemModalOpen && (
        <div className={styles.modalOverlay} onClick={closeItemModal}>
          <div className={styles.reportModal} onClick={(event) => event.stopPropagation()}>
            <button className={styles.closeBtn} type="button" onClick={closeItemModal} aria-label="Cerrar formulario">
              ✕
            </button>
            <h2>Agregar artículo de prueba</h2>
            <p className={styles.formHint}>El responsable será tu usuario actual. Selecciona el lugar donde se registrará el artículo.</p>
            <form className={styles.reportForm} onSubmit={submitItem}>
              <label htmlFor="itemName">Nombre</label>
              <input id="itemName" required maxLength={30} value={newItem.itemName} onChange={(event) => setNewItem({ ...newItem, itemName: event.target.value })} />
              <label htmlFor="itemDescription">Descripción</label>
              <textarea id="itemDescription" required maxLength={255} rows={3} value={newItem.itemDescription} onChange={(event) => setNewItem({ ...newItem, itemDescription: event.target.value })} />
              <label htmlFor="itemCost">Costo</label>
              <input id="itemCost" required min="1" step="1" type="number" value={newItem.cost} onChange={(event) => setNewItem({ ...newItem, cost: event.target.value })} />
              <label htmlFor="itemManufacturer">Fabricante</label>
              <input id="itemManufacturer" required maxLength={25} value={newItem.manufacter} onChange={(event) => setNewItem({ ...newItem, manufacter: event.target.value })} />
              <label htmlFor="itemCodeBar">Código de barras</label>
              <input id="itemCodeBar" maxLength={25} value={newItem.codeBar} onChange={(event) => setNewItem({ ...newItem, codeBar: event.target.value })} />
              <label htmlFor="itemCategory">Categoría</label>
              <select id="itemCategory" required value={newItem.categoryId} onChange={(event) => setNewItem({ ...newItem, categoryId: event.target.value })}>
                <option value="" disabled>Selecciona una categoría</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.categoryName}
                  </option>
                ))}
              </select>
              <label htmlFor="itemPlace">Lugar</label>
              <select id="itemPlace" required value={newItem.fk_place} onChange={(event) => setNewItem({ ...newItem, fk_place: event.target.value })}>
                <option value="" disabled>Selecciona un lugar</option>
                {availablePlaces.map((place) => (
                  <option key={place.placeId} value={place.placeId}>
                    {place.placeLocation} - {place.placeName}
                  </option>
                ))}
              </select>
              {itemMessage && <p className={styles.reportMessage}>{itemMessage}</p>}
              <div className={styles.reportActions}>
                <button className={styles.cancelBtn} type="button" onClick={closeItemModal}>Cancelar</button>
                <button className={styles.submitReportBtn} type="submit" disabled={isSubmittingItem}>
                  {isSubmittingItem ? 'Guardando...' : 'Guardar artículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isReportOpen && selectedItem && (
        <div className={styles.reportOverlay} onClick={() => setIsReportOpen(false)}>
          <div className={styles.reportModal} onClick={(event) => event.stopPropagation()}>
            <button className={styles.closeBtn} type="button" onClick={() => setIsReportOpen(false)} aria-label="Cerrar reporte">
              ✕
            </button>
            <h2>Reportar mobiliario</h2>
            <ReportForm
              items={items}
              places={availablePlaces}
              userId={currentUser?.userId ?? 0}
              initialItem={selectedItem}
              employeeAccounts={employeeAccounts}
              isAdmin={isAdminOrSuper}
              isSuperAdmin={isSuperAdmin}
              isSubmitting={isSubmittingReport}
              message={reportMessage}
              onSubmit={submitReport}
              onValidationError={setReportMessage}
              onCancel={() => setIsReportOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

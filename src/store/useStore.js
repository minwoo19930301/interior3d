import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

const useStore = create((set) => ({
  objects: [],
  selectedId: null,

  addObject: (type) => set((state) => {
    const newObject = {
      id: uuidv4(),
      type,
      position: [0, 0, 0], // Default spawn position
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    };
    return { objects: [...state.objects, newObject], selectedId: newObject.id };
  }),

  removeObject: (id) => set((state) => ({
    objects: state.objects.filter((obj) => obj.id !== id),
    selectedId: state.selectedId === id ? null : state.selectedId,
  })),

  selectObject: (id) => set({ selectedId: id }),

  updateObject: (id, newData) => set((state) => ({
    objects: state.objects.map((obj) =>
      obj.id === id ? { ...obj, ...newData } : obj
    ),
  })),
}));

export default useStore;

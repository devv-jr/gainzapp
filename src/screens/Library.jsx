import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography } from '../styles/globalStyles';
import { clearExerciseCache, diagnoseConnectivity } from '../services/exerciseApi';
import { 
  useAPIInitialization, 
  useExercises
} from '../utils/apiSetup';

const Library = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Todos');
  const [filterType, setFilterType] = useState('muscle'); // Removed 'Parte del Cuerpo' filter by defaulting to 'muscle'
  
  // Usar hooks personalizados para manejar toda la lógica de la API
  const { 
    isInitialized, 
    availableFilters, 
    filtersMeta,
    error: initError,
    changeFilterType 
  } = useAPIInitialization({ initialFilterType: 'muscle' });
  
  const {
    exercises,
    loading,
    error: exercisesError,
    lastOperation,
    loadExercises,
    searchExercises,
    filterByType,
    refreshExercises,
    clearAndReload
  } = useExercises();

  const [refreshing, setRefreshing] = useState(false);
  const error = initError || exercisesError;

  // Cargar ejercicios iniciales cuando la API esté inicializada
  useEffect(() => {
    if (isInitialized) {
      loadExercises();
    }
  }, [isInitialized]);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (!isInitialized) return;
    
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchExercises(searchQuery);
      } else {
        loadExercises();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isInitialized]);

  // Función para refrescar datos con limpieza inteligente
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await clearExerciseCache(); // Limpieza completa del cache
      await refreshExercises();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Cambiar tipo de filtro usando el hook
  const handleFilterTypeChange = async (type) => {
    setFilterType(type);
    setSelectedFilter('Todos');
    await changeFilterType(type);
  };

  // Filtrar por categoría específica
  const handleCategoryFilter = async (filterValue) => {
    setSelectedFilter(filterValue);
    
    if (filterValue === 'Todos') {
      await loadExercises();
    } else {
      // Buscar el filtro correspondiente al nombre en español
      const filterItem = availableFilters.find(f => f.nameEs === filterValue);
      if (filterItem) {
        // Usar nameEs para el filtrado, no ID
        await filterByType(filterType, filterItem.nameEs);
      } else {
        console.warn(`No se encontró filtro para: ${filterValue}`);
        await loadExercises();
      }
    }
  };

  const filterOptions = [
    'Todos',
    ...availableFilters.map(filter => filter.nameEs)
  ];

  // Los ejercicios ya están filtrados por los hooks
  const filteredExercises = useMemo(() => {
    return exercises;
  }, [exercises]);

  // Navegar a detalles del ejercicio
  const navigateToExerciseDetail = (exercise) => {
    navigation.navigate('ExerciseDetail', { exercise });
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Principiante': return colors.success;
      case 'Intermedio': return colors.warning;
      case 'Avanzado': return colors.error;
      default: return colors.textMuted;
    }
  };

  const renderExerciseCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.exerciseCard}
      onPress={() => navigateToExerciseDetail(item)}
    >
      <View style={styles.exerciseIconContainer}>
        {item.image ? (
          <Image 
            source={{ uri: item.image }} 
            style={styles.exerciseImage}
            resizeMode="cover"
            onError={(error) => {
              console.log('Error cargando imagen en lista:', error.nativeEvent.error);
            }}
          />
        ) : (
          <MaterialIcons 
            name={item.icon || 'fitness-center'} 
            size={24} 
            color={colors.primary} 
          />
        )}
      </View>
      
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseEquipment}>{item.equipment}</Text>
        
        <View style={styles.musclesContainer}>
          <Text style={styles.musclesLabel}>Músculos principales:</Text>
          <Text style={styles.musclesText}>
            {item.primaryMuscles.join(', ')}
          </Text>
        </View>
        
        <View style={styles.difficultyContainer}>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
            <Text style={styles.difficultyText}>{item.difficulty}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.exerciseArrow}>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );

  // Loading component mejorado con información sobre Render
  const LoadingComponent = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Cargando ejercicios...</Text>
      <Text style={styles.loadingSubtext}>
        {loading && exercises.length === 0 
          ? 'La API puede estar iniciándose. Esto puede tomar 30-60 segundos la primera vez.'
          : 'Obteniendo datos...'
        }
      </Text>
    </View>
  );

  // Error component mejorado con información de diagnóstico
  const ErrorComponent = () => (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={48} color={colors.error} />
      <Text style={styles.errorText}>{error}</Text>
      {lastOperation && (
        <Text style={styles.errorSubtext}>
          Última operación: {lastOperation}
        </Text>
      )}
      <TouchableOpacity style={styles.retryButton} onPress={() => loadExercises()}>
        <Text style={styles.retryButtonText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={globalStyles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Biblioteca de Ejercicios</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {filteredExercises.length} ejercicios {loading ? 'cargando...' : 'disponibles'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar ejercicios..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            editable={!loading}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Type Selector */}
      <View style={styles.filterTypeContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTypeContent}
        >
          <TouchableOpacity
            style={[
              styles.filterTypeButton,
              filterType === 'muscle' && styles.filterTypeButtonActive
            ]}
            onPress={() => handleFilterTypeChange('muscle')}
          >
            <MaterialIcons 
              name="fitness-center" 
              size={16} 
              color={filterType === 'muscle' ? colors.background : colors.textSecondary} 
            />
            <Text style={[
              styles.filterTypeText,
              filterType === 'muscle' && styles.filterTypeTextActive
            ]}>
              Músculo
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterTypeButton,
              filterType === 'equipment' && styles.filterTypeButtonActive
            ]}
            onPress={() => handleFilterTypeChange('equipment')}
          >
            <MaterialIcons 
              name="sports-gymnastics" 
              size={16} 
              color={filterType === 'equipment' ? colors.background : colors.textSecondary} 
            />
            <Text style={[
              styles.filterTypeText,
              filterType === 'equipment' && styles.filterTypeTextActive
            ]}>
              Equipamiento
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Filter Options */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                selectedFilter === filter && styles.filterChipActive
              ]}
              onPress={() => {
                setSelectedFilter(filter);
                if (filter === 'Todos') {
                  loadExercises();
                } else {
                  handleCategoryFilter(filter);
                }
              }}
              disabled={loading}
            >
              <Text style={[
                styles.filterChipText,
                selectedFilter === filter && styles.filterChipTextActive
              ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {!isInitialized ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Inicializando API...</Text>
        </View>
      ) : loading ? (
        <LoadingComponent />
      ) : error ? (
        <ErrorComponent />
      ) : (
        <FlatList
          data={filteredExercises}
          renderItem={renderExerciseCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No se encontraron ejercicios</Text>
              <Text style={styles.emptySubtext}>
                Intenta con otros términos de búsqueda o verifica tu conexión
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.h2,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
  },
  filterTypeContainer: {
    marginBottom: spacing.sm,
  },
  filterTypeContent: {
    paddingHorizontal: spacing.lg,
  },
  filterTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTypeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  filterTypeTextActive: {
    color: colors.background,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
  },
  filterChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.background,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...globalStyles.shadow,
  },
  exerciseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  exerciseImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  exerciseEquipment: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  musclesContainer: {
    marginBottom: spacing.sm,
  },
  musclesLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: 2,
  },
  musclesText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 11,
    color: colors.background,
    fontWeight: '600',
  },
  exerciseArrow: {
    marginLeft: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  loadingSubtext: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorSubtext: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default Library;
import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Layers, 
  Hash, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  QrCode, 
  Scan, 
  MapPin, 
  ShieldCheck, 
  Trash2,
  Sparkles,
  Building,
  Store,
  Info,
  Check,
  Compass,
  ArrowRight,
  FolderKanban,
  Wrench,
  SlidersHorizontal,
  CheckSquare,
  Square,
  PackagePlus,
  ListPlus,
  ExternalLink,
  RefreshCw,
  Box,
  Tag
} from "lucide-react";
import { 
  WarehousePanelTypeEntry, 
  PanelConditionType, 
  PanelInventoryStatus, 
  PanelStorageLocation,
  RegisteredWarehouse,
  RegisteredSite,
  MasterProjectRecord,
  MasterSiteStoreRecord,
  MasterStorageLocationRecord,
  PanelAccessoryEntry,
  AccessoryMasterCatalogItem,
  StairPanelConfig,
  PanelMasterCatalogItem
} from "../../types";
import { MasterDataService, INITIAL_ACCESSORY_CATALOG, INITIAL_PANEL_TYPES, INITIAL_MANUFACTURERS } from "../../services/masterDataService";
import { SearchableSmartDropdown, DropdownOption } from "../common/SearchableSmartDropdown";

interface AddPanelTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: WarehousePanelTypeEntry) => void;
  existingSerials?: string[];
  initialData?: WarehousePanelTypeEntry | null;
  warehouseName: string;
  warehouseId: string;
  isAmharic?: boolean;
  currentUserRole?: string;
  currentUserName?: string;
}

export const AddPanelTypeModal: React.FC<AddPanelTypeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingSerials = [],
  initialData,
  warehouseName,
  warehouseId,
  isAmharic = false,
  currentUserRole = "Super Admin",
  currentUserName = "Authorized Manager"
}) => {
  // --- 1. MASTER DATA STATES ---
  const [panelCatalog, setPanelCatalog] = useState<PanelMasterCatalogItem[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availablePanelTypes, setAvailablePanelTypes] = useState<string[]>([]);
  const [availablePanelNames, setAvailablePanelNames] = useState<string[]>([]);
  const [availableManufacturers, setAvailableManufacturers] = useState<Array<{ manufacturer: string; formworkSystem?: string }>>([]);
  const [availableDimensions, setAvailableDimensions] = useState<any[]>([]);
  const [availableCodes, setAvailableCodes] = useState<PanelMasterCatalogItem[]>([]);

  // Project, Site, Warehouse, Site Store, Location master records
  const [projects, setProjects] = useState<MasterProjectRecord[]>([]);
  const [sites, setSites] = useState<RegisteredSite[]>([]);
  const [warehouses, setWarehouses] = useState<RegisteredWarehouse[]>([]);
  const [siteStores, setSiteStores] = useState<MasterSiteStoreRecord[]>([]);
  const [existingLocations, setExistingLocations] = useState<MasterStorageLocationRecord[]>([]);

  // --- 2. CASCADING SELECTIONS (Prompt 2 & 3 exact relationship):
  // Panel Category -> Panel Type -> Panel Name -> Manufacturer/Formwork System -> Dimension -> Panel Code -> Compatible Accessories
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialData?.panelCategory || "Internal Wall"
  );
  const [selectedPanelType, setSelectedPanelType] = useState<string>(
    initialData?.panelTypeName || "Internal Wall Panel"
  );
  const [selectedPanelName, setSelectedPanelName] = useState<string>(
    initialData?.panelName || "Internal Wall Standard Modular Panel"
  );
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>(
    initialData?.manufacturer || "Mivan Technology Corp"
  );
  const [selectedFormworkSystem, setSelectedFormworkSystem] = useState<string>(
    initialData?.formworkSystem || "Mivan 65mm Standard System"
  );
  const [selectedDimensionStr, setSelectedDimensionStr] = useState<string>(
    initialData?.dimension.formatted || "1200 × 600 × 65 mm"
  );
  const [panelCode, setPanelCode] = useState<string>(initialData?.panelCode || "IWP-1200-600");
  const [manufacturerCode, setManufacturerCode] = useState<string>("MIV-IWP-1260");
  const [internalErpCode, setInternalErpCode] = useState<string>("ERP-IWP-1200");
  const [panelCategory, setPanelCategory] = useState<WarehousePanelTypeEntry["panelCategory"]>(
    initialData?.panelCategory || "Internal Wall"
  );
  const [length, setLength] = useState<number>(initialData?.dimension.length || 1200);
  const [width, setWidth] = useState<number>(initialData?.dimension.width || 600);
  const [heightThickness, setHeightThickness] = useState<number>(initialData?.dimension.heightThickness || 65);
  const [height, setHeight] = useState<number | undefined>(initialData?.dimension.height || undefined);
  const [unit, setUnit] = useState<"mm" | "m" | string>(initialData?.dimension.unit || "mm");
  const [description, setDescription] = useState<string>(initialData?.description || "");
  const [manufacturer, setManufacturer] = useState<string>("Mivan Technology Corp");
  const [weightKg, setWeightKg] = useState<number>(14.8);

  // Dedicated Stair Panel Configuration (Prompt 10)
  const [isStairCategory, setIsStairCategory] = useState<boolean>(false);
  const [stairPanelType, setStairPanelType] = useState<string>("Flight Panel");
  const [stairWidth, setStairWidth] = useState<number>(1200);
  const [stairTread, setStairTread] = useState<number>(300);
  const [stairRiser, setStairRiser] = useState<number>(150);
  const [stairSlope, setStairSlope] = useState<number>(30.5);
  const [stairSteps, setStairSteps] = useState<number>(10);

  // Destination Site & Structural Tracking (Prompt 14)
  const [building, setBuilding] = useState<string>(initialData?.building || "Tower A");
  const [floor, setFloor] = useState<number>(initialData?.floor ?? 1);
  const [zone, setZone] = useState<string>(initialData?.zone || "Zone 1 - East Wing");
  const [stair, setStair] = useState<string>(initialData?.stair || "Stair Core 1");

  // Admin Master Data Modals (Prompt 12 & 13)
  const [showAddTypeModal, setShowAddTypeModal] = useState<boolean>(false);
  const [showAddDimModal, setShowAddDimModal] = useState<boolean>(false);
  const [showAddMfrModal, setShowAddMfrModal] = useState<boolean>(false);
  const [showRequestMasterModal, setShowRequestMasterModal] = useState<boolean>(false);

  // Form states for adding new master records
  const [newTypeName, setNewTypeName] = useState<string>("");
  const [newTypeCategory, setNewTypeCategory] = useState<string>("Wall Panel");
  const [newTypeDescription, setNewTypeDescription] = useState<string>("");

  const [newDimLength, setNewDimLength] = useState<number>(1200);
  const [newDimWidth, setNewDimWidth] = useState<number>(600);
  const [newDimThickness, setNewDimThickness] = useState<number>(65);
  const [newDimUnit, setNewDimUnit] = useState<string>("mm");

  const [newMfrName, setNewMfrName] = useState<string>("");
  const [newMfrSystem, setNewMfrSystem] = useState<string>("");
  const [newMfrCountry, setNewMfrCountry] = useState<string>("Global");

  const [requestMasterDetails, setRequestMasterDetails] = useState<string>("");
  const [requestMasterReason, setRequestMasterReason] = useState<string>("");
  const [masterSuccessMessage, setMasterSuccessMessage] = useState<string | null>(null);
  const [masterErrorMessage, setMasterErrorMessage] = useState<string | null>(null);

  // Check admin authorization
  const isMasterDataAdmin = ["Super Admin", "Head Office", "Head Office Manager", "Admin / Head Office", "Master Data Administrator"].includes(currentUserRole);

  // --- 2.2 ACCESSORIES MASTER DATA & CASCADING STATES ---
  const [accessoriesList, setAccessoriesList] = useState<PanelAccessoryEntry[]>(
    initialData?.accessories || []
  );
  const [compatibleAccessories, setCompatibleAccessories] = useState<AccessoryMasterCatalogItem[]>([]);
  const [showAllAccessories, setShowAllAccessories] = useState<boolean>(false);

  // Active cascading selection for adding/configuring accessory:
  const [selectedAccName, setSelectedAccName] = useState<string>("Tie Rod");
  const [selectedAccType, setSelectedAccType] = useState<string>("Formwork Tie");
  const [selectedAccDimension, setSelectedAccDimension] = useState<string>("15 mm");
  const [selectedAccCode, setSelectedAccCode] = useState<string>("TR-15");
  const [accQty, setAccQty] = useState<number>(100);
  const [accCondition, setAccCondition] = useState<PanelConditionType>("Good");
  const [accStatus, setAccStatus] = useState<PanelInventoryStatus>("Available");
  const [accLocation, setAccLocation] = useState<string>("");
  const [accSerial, setAccSerial] = useState<string>("");

  // --- 3. CASCADING PANEL SITE ASSIGNMENT: Project -> Site -> Warehouse / Site Store -> Location ---
  const [assignedProjectId, setAssignedProjectId] = useState<string>("PRJ-001");
  const [assignedSiteId, setAssignedSiteId] = useState<string>("Digital Construction ERP-SITE-2026-001");
  const [targetFacilityType, setTargetFacilityType] = useState<"warehouse" | "site_store">("warehouse");
  const [assignedWarehouseId, setAssignedWarehouseId] = useState<string>(warehouseId || "WH-ADDIS-CENTRAL-01");
  const [assignedSiteStoreId, setAssignedSiteStoreId] = useState<string>("STORE-BOL-01");

  // Selected storage location
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  // Location manual entry & similarity detection
  const [isEnteringCustomLocation, setIsEnteringCustomLocation] = useState<boolean>(false);
  const [newSection, setNewSection] = useState<string>("Section A");
  const [newRack, setNewRack] = useState<string>("Rack 01");
  const [newBay, setNewBay] = useState<string>("Bay 01");
  const [newRow, setNewRow] = useState<string>("Row 01");
  const [newStack, setNewStack] = useState<string>("Stack 01");
  const [newBin, setNewBin] = useState<string>("A1");

  // Similarity matches found
  const [similarLocations, setSimilarLocations] = useState<any[]>([]);
  const [hasConfirmedSimilarLocation, setHasConfirmedSimilarLocation] = useState<boolean>(false);

  // --- 4. CONDITION & STATUS ---
  const [condition, setCondition] = useState<PanelConditionType>(initialData?.condition || "Good");
  const [status, setStatus] = useState<PanelInventoryStatus>(initialData?.status || "Available");
  const [unitCostEtb, setUnitCostEtb] = useState<number>(initialData?.unitCostEtb || 4500);

  // --- 5. SERIAL NUMBER MANAGEMENT & QUANTITY ---
  const [quantity, setQuantity] = useState<number>(initialData?.quantity || 50);
  const [serialMode, setSerialMode] = useState<"Range" | "Individual">(initialData?.serialMode || "Range");
  const [serialPrefix, setSerialPrefix] = useState<string>(initialData?.serialPrefix || "WP");
  const [startNum, setStartNum] = useState<string>(initialData?.serialRangeStart || "001");
  const [endNum, setEndNum] = useState<string>(initialData?.serialRangeEnd || "050");
  const [individualInput, setIndividualInput] = useState<string>(
    initialData?.individualSerialNumbers.join("\n") || ""
  );

  // Generator & Confirmation modal
  const [showConfirmGenerated, setShowConfirmGenerated] = useState<boolean>(false);
  const [tempGeneratedList, setTempGeneratedList] = useState<string[]>([]);

  // Computed strings
  const formattedDimension = `${width} × ${length} ${unit}${heightThickness ? ` (${heightThickness}${unit} profile)` : ""}`;

  // Current active location object
  const computedLocation = useMemo<PanelStorageLocation>(() => {
    if (!isEnteringCustomLocation) {
      const match = existingLocations.find(l => l.id === selectedLocationId);
      if (match) {
        return {
          warehouse: targetFacilityType === "warehouse" ? warehouseName : undefined,
          section: match.section,
          row: match.row,
          rack: match.rack,
          bay: match.bay,
          stack: match.stack,
          bin: match.bin,
          formattedLocation: match.formattedLocation
        };
      }
    }

    const fmt = [
      newSection,
      newRack ? `Rack ${newRack.replace(/^rack\s*/i, "")}` : "",
      newBay ? `Bay ${newBay.replace(/^bay\s*/i, "")}` : "",
      newRow ? `Row ${newRow.replace(/^row\s*/i, "")}` : "",
      newStack ? `Stack ${newStack.replace(/^stack\s*/i, "")}` : "",
      newBin ? `(${newBin})` : ""
    ].filter(Boolean).join(" → ");

    return {
      warehouse: targetFacilityType === "warehouse" ? warehouseName : undefined,
      section: newSection,
      row: newRow,
      rack: newRack,
      bay: newBay,
      stack: newStack,
      bin: newBin,
      formattedLocation: fmt
    };
  }, [
    isEnteringCustomLocation,
    selectedLocationId,
    existingLocations,
    targetFacilityType,
    warehouseName,
    newSection,
    newRack,
    newBay,
    newRow,
    newStack,
    newBin
  ]);

  // Load master data on mount
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [cat, types, prjs, whs, allSites] = await Promise.all([
          MasterDataService.getPanelCatalog({ activeOnly: true }),
          MasterDataService.getAvailablePanelTypes(),
          MasterDataService.getMasterProjects(),
          MasterDataService.getWarehouses(),
          MasterDataService.getSitesForProject("ALL")
        ]);

        setPanelCatalog(cat);
        setAvailablePanelTypes(types);
        setProjects(prjs);
        setWarehouses(whs);
        setSites(allSites);

        // Load locations for current facility
        const locs = await MasterDataService.getStorageLocations(warehouseId);
        setExistingLocations(locs);
        if (locs.length > 0 && !selectedLocationId) {
          setSelectedLocationId(locs[0].id);
        }
      } catch (err) {
        console.error("Error loading master data:", err);
      }
    };
    loadMasterData();
  }, [warehouseId]);

  // 1. When selectedPanelType changes -> load available standard dimensions
  useEffect(() => {
    const updateDimensions = async () => {
      if (!selectedPanelType) return;
      const dims = await MasterDataService.getDimensionsForPanelType(selectedPanelType);
      setAvailableDimensions(dims);

      if (dims.length > 0) {
        const first = dims[0];
        setSelectedDimensionStr(first.standardDimension);
        setLength(first.length);
        setWidth(first.width);
        setHeightThickness(first.thickness);
        setUnit(first.unit);
      }
    };
    updateDimensions();
  }, [selectedPanelType]);

  // 2. When selectedPanelType or dimension changes -> load available panel codes
  useEffect(() => {
    const updateCodes = async () => {
      if (!selectedPanelType || !width || !length) return;
      const codes = await MasterDataService.getCodesForTypeAndDimension(selectedPanelType, width, length);
      setAvailableCodes(codes);

      if (codes.length > 0) {
        const first = codes[0];
        setPanelCode(first.panelCode);
        setManufacturer(first.manufacturer || "Mivan Technology Corp");
        if (first.weightKg) setWeightKg(first.weightKg);
        if (first.description) setDescription(first.description);

        // Update category & serial prefix
        const catStr = first.category || "";
        if (catStr.includes("Wall")) {
          setPanelCategory("Wall");
          setSerialPrefix("WP");
        } else if (catStr.includes("Slab")) {
          setPanelCategory("Slab");
          setSerialPrefix("SP");
        } else if (catStr.includes("Corner") || catStr.includes("Angle")) {
          setPanelCategory("Corner");
          setSerialPrefix("CP");
        } else if (catStr.includes("Column")) {
          setPanelCategory("Column");
          setSerialPrefix("COL");
        } else if (catStr.includes("Beam")) {
          setPanelCategory("Beam");
          setSerialPrefix("BP");
        } else if (catStr.includes("Deck")) {
          setPanelCategory("Deck");
          setSerialPrefix("DP");
        }
      }
    };
    updateCodes();
  }, [selectedPanelType, width, length]);

  // 2.3 When selectedPanelType, panelCode or showAllAccessories changes -> update compatible accessories
  useEffect(() => {
    const updateAccessories = async () => {
      const list = await MasterDataService.getCompatibleAccessories(
        selectedPanelType,
        panelCode,
        showAllAccessories
      );
      setCompatibleAccessories(list);

      const names = MasterDataService.getDistinctAccessoryNames(list);
      if (names.length > 0 && (!selectedAccName || !names.includes(selectedAccName))) {
        setSelectedAccName(names[0]);
      }
    };
    updateAccessories();
  }, [selectedPanelType, panelCode, showAllAccessories]);

  // 2.4 When selectedAccName changes -> update accessory types
  useEffect(() => {
    if (!selectedAccName || compatibleAccessories.length === 0) return;
    const types = MasterDataService.getAccessoryTypesForName(selectedAccName, compatibleAccessories);
    if (types.length > 0) {
      setSelectedAccType(types[0]);
    } else {
      setSelectedAccType("");
    }
  }, [selectedAccName, compatibleAccessories]);

  // 2.5 When selectedAccName or selectedAccType changes -> update standard dimensions
  useEffect(() => {
    if (!selectedAccName || compatibleAccessories.length === 0) return;
    const dims = MasterDataService.getAccessoryDimensionsForNameAndType(
      selectedAccName,
      selectedAccType,
      compatibleAccessories
    );
    if (dims.length > 0) {
      setSelectedAccDimension(dims[0]);
    } else {
      setSelectedAccDimension("");
    }
  }, [selectedAccName, selectedAccType, compatibleAccessories]);

  // 2.6 When selectedAccDimension changes -> update accessory code & ratio
  useEffect(() => {
    if (!selectedAccName || !selectedAccDimension || compatibleAccessories.length === 0) return;
    const codes = MasterDataService.getAccessoryCodesForSelection(
      selectedAccName,
      selectedAccDimension,
      selectedAccType,
      compatibleAccessories
    );
    if (codes.length > 0) {
      const first = codes[0];
      setSelectedAccCode(first.accessoryCode);
      if (first.defaultQtyRatioPerPanel) {
        setAccQty(Math.max(1, first.defaultQtyRatioPerPanel * (quantity || 1)));
      }
    } else {
      setSelectedAccCode("");
    }
  }, [selectedAccName, selectedAccType, selectedAccDimension, compatibleAccessories, quantity]);

  // 3. When Project changes -> filter Sites
  useEffect(() => {
    const updateSites = async () => {
      if (!assignedProjectId) return;
      const projectSites = await MasterDataService.getSitesForProject(assignedProjectId);
      setSites(projectSites);
      if (projectSites.length > 0 && !projectSites.some(s => s.id === assignedSiteId)) {
        setAssignedSiteId(projectSites[0].id);
      }
    };
    updateSites();
  }, [assignedProjectId]);

  // 4. When Site changes -> filter Site Stores
  useEffect(() => {
    const updateSiteStores = async () => {
      if (!assignedSiteId) return;
      const stores = await MasterDataService.getSiteStoresForSite(assignedSiteId);
      setSiteStores(stores);
      if (stores.length > 0) {
        setAssignedSiteStoreId(stores[0].id);
      }
    };
    updateSiteStores();
  }, [assignedSiteId]);

  // 5. Similarity check whenever custom location values change
  useEffect(() => {
    if (!isEnteringCustomLocation) {
      setSimilarLocations([]);
      return;
    }

    const checkSimilarity = async () => {
      const matches = await MasterDataService.findSimilarLocations({
        warehouseId: targetFacilityType === "warehouse" ? assignedWarehouseId : undefined,
        siteStoreId: targetFacilityType === "site_store" ? assignedSiteStoreId : undefined,
        section: newSection,
        rack: newRack,
        bay: newBay,
        row: newRow,
        bin: newBin
      });
      setSimilarLocations(matches);
      setHasConfirmedSimilarLocation(false);
    };

    const timer = setTimeout(checkSimilarity, 250);
    return () => clearTimeout(timer);
  }, [
    isEnteringCustomLocation,
    newSection,
    newRack,
    newBay,
    newRow,
    newBin,
    targetFacilityType,
    assignedWarehouseId,
    assignedSiteStoreId
  ]);

  // Parse individual serial numbers from textarea
  const parsedIndividualSerials = individualInput
    .split(/[\n,]+/)
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length > 0);

  // Check for duplicates
  const internalDuplicates = parsedIndividualSerials.filter(
    (item, index) => parsedIndividualSerials.indexOf(item) !== index
  );
  const externalDuplicates = parsedIndividualSerials.filter(
    s => existingSerials.includes(s) && !initialData?.individualSerialNumbers.includes(s)
  );

  // Validation
  const hasDuplicateError = internalDuplicates.length > 0 || externalDuplicates.length > 0;
  const isIndividualCountMismatch = serialMode === "Individual" && parsedIndividualSerials.length !== quantity;

  // Handle Automatic Serial Generation
  const handleGenerateSerials = () => {
    const sInt = parseInt(startNum, 10);
    const eInt = parseInt(endNum, 10);
    if (isNaN(sInt) || isNaN(eInt) || eInt < sInt) {
      alert(isAmharic ? "እባክዎን ትክክለኛ መነሻ እና መድረሻ ቁጥር ያስገቡ።" : "Please enter a valid starting and ending number range.");
      return;
    }
    const padLength = Math.max(startNum.length, endNum.length, 3);
    const generated: string[] = [];
    for (let i = sInt; i <= eInt; i++) {
      const padded = String(i).padStart(padLength, "0");
      generated.push(`${serialPrefix.trim().toUpperCase()}-${padded}`);
    }
    setTempGeneratedList(generated);
    setShowConfirmGenerated(true);
  };

  const handleConfirmGenerated = () => {
    setIndividualInput(tempGeneratedList.join("\n"));
    setQuantity(tempGeneratedList.length);
    setShowConfirmGenerated(false);
    setSerialMode("Individual");
  };

  // Convert panel types to dropdown options
  const panelTypeOptions: DropdownOption[] = useMemo(() => {
    return availablePanelTypes.map(t => ({
      id: t,
      label: t,
      badge: "International Formwork Standard"
    }));
  }, [availablePanelTypes]);

  // Convert dimensions to dropdown options
  const dimensionOptions: DropdownOption[] = useMemo(() => {
    return availableDimensions.map(d => ({
      id: d.standardDimension,
      label: d.standardDimension,
      subLabel: `${d.width}mm width × ${d.length}mm length (${d.thickness}mm profile)`,
      isVerified: d.isVerifiedStandard
    }));
  }, [availableDimensions]);

  // Convert codes to dropdown options
  const codeOptions: DropdownOption[] = useMemo(() => {
    return availableCodes.map(c => ({
      id: c.panelCode,
      label: c.panelCode,
      code: c.panelCode,
      subLabel: `Mfr: ${c.manufacturer}${c.weightKg ? ` • ${c.weightKg} kg` : ""}`,
      badge: c.category
    }));
  }, [availableCodes]);

  // Project Dropdown options
  const projectOptions: DropdownOption[] = useMemo(() => {
    return projects.map(p => ({
      id: p.id,
      label: p.name,
      code: p.code,
      subLabel: p.location,
      badge: p.status
    }));
  }, [projects]);

  // Site Dropdown options
  const siteOptions: DropdownOption[] = useMemo(() => {
    return sites.map(s => ({
      id: s.id,
      label: s.projectName,
      code: s.id,
      subLabel: `${s.region} • ${s.cityWoreda}`,
      badge: s.status
    }));
  }, [sites]);

  // Warehouse Dropdown options
  const warehouseOptions: DropdownOption[] = useMemo(() => {
    return warehouses.map(w => ({
      id: w.id,
      label: w.name,
      code: w.code,
      subLabel: `${w.type} • ${w.citySite}`,
      badge: w.status
    }));
  }, [warehouses]);

  // Site Store Dropdown options
  const siteStoreOptions: DropdownOption[] = useMemo(() => {
    return siteStores.map(s => ({
      id: s.id,
      label: s.name,
      code: s.code,
      subLabel: `Keeper: ${s.storeKeeperName} (${s.storeKeeperPhone})`,
      badge: s.status
    }));
  }, [siteStores]);

  // Location Dropdown options
  const locationOptions: DropdownOption[] = useMemo(() => {
    return existingLocations.map(l => ({
      id: l.id,
      label: l.formattedLocation,
      code: l.bin || l.rack || l.section,
      subLabel: l.notes || `Section ${l.section}`
    }));
  }, [existingLocations]);

  // --- ACCESSORIES DROPDOWN OPTIONS & ACTION HANDLERS ---
  const accNameOptions: DropdownOption[] = useMemo(() => {
    const names = MasterDataService.getDistinctAccessoryNames(compatibleAccessories);
    return names.map(n => {
      const isAttached = accessoriesList.some(a => a.accessoryName === n);
      return {
        id: n,
        label: n,
        code: n,
        subLabel: isAttached ? "✓ Currently Attached" : "Compatible Component",
        badge: isAttached ? "Attached" : undefined
      };
    });
  }, [compatibleAccessories, accessoriesList]);

  const accTypeOptions: DropdownOption[] = useMemo(() => {
    const types = MasterDataService.getAccessoryTypesForName(selectedAccName, compatibleAccessories);
    return types.map(t => ({
      id: t,
      label: t,
      code: t
    }));
  }, [selectedAccName, compatibleAccessories]);

  const accDimensionOptions: DropdownOption[] = useMemo(() => {
    const dims = MasterDataService.getAccessoryDimensionsForNameAndType(
      selectedAccName,
      selectedAccType,
      compatibleAccessories
    );
    return dims.map(d => ({
      id: d,
      label: d,
      code: d,
      subLabel: "Standard Catalog Dimension",
      isVerified: true
    }));
  }, [selectedAccName, selectedAccType, compatibleAccessories]);

  const accCodeOptions: DropdownOption[] = useMemo(() => {
    const codes = MasterDataService.getAccessoryCodesForSelection(
      selectedAccName,
      selectedAccDimension,
      selectedAccType,
      compatibleAccessories
    );
    return codes.map(c => ({
      id: c.accessoryCode,
      label: c.accessoryCode,
      code: c.accessoryCode,
      subLabel: `Mfr: ${c.manufacturer} • ${c.unit}${c.weightKg ? ` • ${c.weightKg}kg` : ""}`
    }));
  }, [selectedAccName, selectedAccDimension, selectedAccType, compatibleAccessories]);

  // Active selected accessory catalog item details
  const activeAccessoryCatalogItem = useMemo(() => {
    return MasterDataService.getAccessoryBySelection(
      selectedAccName,
      selectedAccDimension,
      selectedAccCode,
      compatibleAccessories
    );
  }, [selectedAccName, selectedAccDimension, selectedAccCode, compatibleAccessories]);

  // Add / Update Accessory
  const handleAddAccessory = () => {
    if (!selectedAccName || !selectedAccCode) {
      alert(isAmharic ? "እባክዎን ከአክሰሰሪ ማስተር ካታሎግ ትክክለኛ ዕቃ ይምረጡ።" : "Please select an accessory from the master catalog.");
      return;
    }

    const item = activeAccessoryCatalogItem;
    const loc = accLocation || computedLocation.formattedLocation || "Warehouse Storage";

    const newAcc: PanelAccessoryEntry = {
      id: `ACC-INST-${Date.now().toString().slice(-6)}-${selectedAccCode}`,
      accessoryCatalogId: item?.id,
      accessoryName: selectedAccName,
      accessoryType: selectedAccType || item?.accessoryType || "Formwork Component",
      accessoryCode: selectedAccCode,
      dimension: selectedAccDimension || item?.standardDimension || "Standard",
      unit: item?.unit || "Pcs",
      manufacturer: item?.manufacturer || manufacturer,
      compatiblePanelType: selectedPanelType,
      compatiblePanelCode: panelCode,
      quantity: Number(accQty) > 0 ? Number(accQty) : 1,
      condition: accCondition,
      serialNumber: accSerial.trim() || undefined,
      storageLocation: loc,
      status: accStatus,
      unitCostEtb: (item?.weightKg || 1) * 350
    };

    setAccessoriesList(prev => {
      const filtered = prev.filter(a => a.accessoryCode !== selectedAccCode);
      return [...filtered, newAcc];
    });
  };

  const handleRemoveAccessory = (code: string) => {
    setAccessoriesList(prev => prev.filter(a => a.accessoryCode !== code));
  };

  const handleToggleCompatibleAccessory = (accName: string) => {
    setSelectedAccName(accName);
    const existing = accessoriesList.find(a => a.accessoryName === accName);
    if (existing) {
      handleRemoveAccessory(existing.accessoryCode);
    } else {
      // Find standard variant and add
      const variants = compatibleAccessories.filter(a => a.accessoryName === accName);
      if (variants.length > 0) {
        const v = variants[0];
        const loc = accLocation || computedLocation.formattedLocation || "Warehouse Storage";
        const newAcc: PanelAccessoryEntry = {
          id: `ACC-INST-${Date.now().toString().slice(-6)}-${v.accessoryCode}`,
          accessoryCatalogId: v.id,
          accessoryName: v.accessoryName,
          accessoryType: v.accessoryType,
          accessoryCode: v.accessoryCode,
          dimension: v.standardDimension,
          unit: v.unit,
          manufacturer: v.manufacturer,
          compatiblePanelType: selectedPanelType,
          compatiblePanelCode: panelCode,
          quantity: Math.max(1, (v.defaultQtyRatioPerPanel || 2) * (quantity || 1)),
          condition: "Good",
          storageLocation: loc,
          status: "Available"
        };
        setAccessoriesList(prev => [...prev.filter(a => a.accessoryCode !== v.accessoryCode), newAcc]);
      }
    }
  };

  const handleAttachRecommendedSet = () => {
    const panelQty = quantity || 1;
    const recommendedConfigs = [
      { name: "Wedge Pin", dim: "16 × 50 mm", code: "WP-1650", ratio: 8 },
      { name: "Pin", dim: "16 × 50 mm", code: "PIN-1650", ratio: 8 },
      { name: "Tie Rod", dim: "15 mm", code: "TR-15", ratio: 2 },
      { name: "Wing Nut", dim: "15 mm", code: "WN-15", ratio: 4 },
      { name: "PVC Cone", dim: "22 mm", code: "PC-22", ratio: 4 },
      { name: "Spacer", dim: "200 mm", code: "SP-200", ratio: 2 },
      { name: "Alignment Wedge", dim: "120 mm", code: "AW-120", ratio: 8 },
      { name: "Push Pull Prop", dim: "1500 - 2500 mm", code: "PPP-1525", ratio: 1 }
    ];

    const loc = computedLocation.formattedLocation || "Warehouse Storage";
    const newItems: PanelAccessoryEntry[] = [];

    for (const rec of recommendedConfigs) {
      const cat = INITIAL_ACCESSORY_CATALOG.find(
        c => c.accessoryCode === rec.code || (c.accessoryName === rec.name && c.standardDimension === rec.dim)
      );
      if (cat) {
        newItems.push({
          id: `ACC-REC-${Date.now().toString().slice(-6)}-${cat.accessoryCode}`,
          accessoryCatalogId: cat.id,
          accessoryName: cat.accessoryName,
          accessoryType: cat.accessoryType,
          accessoryCode: cat.accessoryCode,
          dimension: cat.standardDimension,
          unit: cat.unit,
          manufacturer: cat.manufacturer,
          compatiblePanelType: selectedPanelType,
          compatiblePanelCode: panelCode,
          quantity: Math.max(1, rec.ratio * panelQty),
          condition: "Good",
          storageLocation: loc,
          status: "Available"
        });
      }
    }

    setAccessoriesList(prev => {
      const newCodes = new Set(newItems.map(n => n.accessoryCode));
      return [...prev.filter(p => !newCodes.has(p.accessoryCode)), ...newItems];
    });
  };

  // Final Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (quantity <= 0) {
      alert(isAmharic ? "እባክዎን ከ 0 በላይ የሆነ ትክክለኛ የፓነል ብዛት ያስገቡ።" : "Quantity must be greater than zero.");
      return;
    }

    if (serialMode === "Individual" && parsedIndividualSerials.length !== quantity) {
      alert(
        isAmharic
          ? `የተከታታይ ቁጥሮች ብዛት (${parsedIndividualSerials.length}) ከፓነል ብዛት (${quantity}) ጋር አይዛመድም።`
          : `Serial number count (${parsedIndividualSerials.length}) does not match panel quantity (${quantity}).`
      );
      return;
    }

    if (hasDuplicateError) {
      alert(
        isAmharic
          ? "እባክዎን የተደገሙ ተከታታይ ቁጥሮችን ያስተካክሉ።"
          : "Please resolve duplicate serial numbers before saving."
      );
      return;
    }

    // If entering custom location and similar locations exist, require confirmation
    if (isEnteringCustomLocation && similarLocations.length > 0 && !hasConfirmedSimilarLocation) {
      alert(
        isAmharic
          ? "ተመሳሳይ የመጋዘን መደቦች ተገኝተዋል! እባክዎን ያለውን ይምረጡ ወይም አዲሱን መደብ ማረጋገጥዎን ይጫኑ።"
          : "Similar existing locations were found. Please choose an existing location or click 'Confirm New Location' to proceed."
      );
      return;
    }

    // Save recent master selection
    MasterDataService.recordRecentSelection("panel_types", selectedPanelType);
    MasterDataService.recordRecentSelection("panel_codes", panelCode);

    const rangeFormatted = `${serialPrefix.trim().toUpperCase()}-${startNum}–${serialPrefix.trim().toUpperCase()}-${endNum}`;

    const entry: WarehousePanelTypeEntry = {
      id: initialData?.id || `PT-${Date.now().toString().slice(-6)}`,
      warehouseId: targetFacilityType === "warehouse" ? assignedWarehouseId : assignedSiteStoreId,
      warehouseName: targetFacilityType === "warehouse" ? warehouseName : (siteStores.find(s => s.id === assignedSiteStoreId)?.name || "Site Store"),
      panelTypeName: selectedPanelType,
      panelCode: panelCode.trim().toUpperCase(),
      panelCategory,
      description: description || `Standard 6061-T6 aluminum formwork panel (${selectedDimensionStr})`,
      dimension: {
        length: Number(length),
        width: Number(width),
        heightThickness: Number(heightThickness),
        unit,
        formatted: selectedDimensionStr
      },
      condition,
      serialMode,
      serialPrefix: serialPrefix.trim().toUpperCase(),
      serialRangeStart: startNum,
      serialRangeEnd: endNum,
      serialRangeFormatted: rangeFormatted,
      individualSerialNumbers: serialMode === "Individual" ? parsedIndividualSerials : tempGeneratedList.length ? tempGeneratedList : [rangeFormatted],
      quantity: Number(quantity),
      location: computedLocation,
      status,
      unitCostEtb: Number(unitCostEtb),
      accessories: accessoriesList,
      qrCodePayload: `ERP-PANEL:${panelCode}:${rangeFormatted}:${warehouseName}:${computedLocation.formattedLocation}`,
      barcode: `BC-${panelCode.replace(/[^A-Z0-9]/gi, "")}-${quantity}`,
      updatedAt: new Date().toISOString().split("T")[0]
    };

    onSave(entry);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full my-6 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-amber-400">
              <Layers size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>
                  {initialData 
                    ? (isAmharic ? "የአሉሚኒየም ፓነል ዓይነት ማስተካከያ" : "Edit Formwork Panel Type")
                    : (isAmharic ? "አዲስ የአሉሚኒየም ፎርምወርክ ፓነል መመዝገቢያ" : "Register Aluminum Formwork Panel")}
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
                  Master Data Integrated
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isAmharic ? `ለተቋም፡ ${warehouseName}` : `Target Facility: ${warehouseName} (${warehouseId})`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto text-xs text-slate-200">
          {/* SECTION 1: MASTER DATA CASCADING SELECTION (Panel Type -> Dimension -> Panel Code) */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>1. Panel Type → Standard Dimension → Panel Code (ማስተር ዳታ ምርጫ)</span>
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck size={11} /> Global Catalog Linked
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Level 1: Panel Type Searchable Dropdown */}
              <div>
                <SearchableSmartDropdown
                  label={isAmharic ? "1. የፓነል ዓይነት (Panel Type)" : "1. Select Panel Type"}
                  required
                  options={panelTypeOptions}
                  selectedValue={selectedPanelType}
                  onSelect={opt => setSelectedPanelType(opt.id)}
                  searchPlaceholder="Search panel types..."
                  recentValues={MasterDataService.getRecentSelections("panel_types")}
                />
              </div>

              {/* Level 2: Standard Dimensions Searchable Dropdown */}
              <div>
                <SearchableSmartDropdown
                  label={isAmharic ? "2. ስታንዳርድ ልኬት (Standard Dimension)" : "2. Select Standard Dimension"}
                  required
                  options={dimensionOptions}
                  selectedValue={selectedDimensionStr}
                  onSelect={opt => {
                    setSelectedDimensionStr(opt.id);
                    const match = availableDimensions.find(d => d.standardDimension === opt.id);
                    if (match) {
                      setLength(match.length);
                      setWidth(match.width);
                      setHeightThickness(match.thickness);
                      setUnit(match.unit);
                    }
                  }}
                  searchPlaceholder="Search standard dimensions..."
                />
              </div>

              {/* Level 3: Panel Code Dropdown */}
              <div>
                <SearchableSmartDropdown
                  label={isAmharic ? "3. የፓነል ኮድ (Panel Code)" : "3. Panel Code"}
                  required
                  options={codeOptions}
                  selectedValue={panelCode}
                  onSelect={opt => setPanelCode(opt.id)}
                  searchPlaceholder="Search panel codes..."
                />
              </div>
            </div>

            {/* Selected Spec Quick Preview Banner */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-500 block">Manufacturer:</span>
                  <span className="font-semibold text-slate-200">{manufacturer}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Dimensions:</span>
                  <span className="font-mono font-bold text-amber-400">{formattedDimension}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Category:</span>
                  <span className="font-semibold text-slate-300">{panelCategory}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Standard Weight:</span>
                  <span className="font-mono text-slate-300">{weightKg ? `${weightKg} kg` : "N/A"}</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 italic">
                * Prevents typing duplicates by auto-binding to verified catalog document IDs
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-slate-400 block mb-1 font-bold">
                {isAmharic ? "መግለጫ / ዝርዝር መረጃ" : "Description / Technical Specifications"}
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="High-tensile alloy 6061-T6, 4.0mm face sheet, robotic welding ribs..."
                className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* SECTION 2: ASSOCIATED FORMWORK ACCESSORIES SMART MASTER SELECTOR */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench size={14} />
                  <span>2. Associated Formwork Accessories Master Selector (የተዛማጅ አክሰሰሪዎች ማስተር ዳታ)</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {accessoriesList.length} Attached
                </span>
              </div>

              {/* Action Buttons: Show All Accessories & Attach Recommended Set */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAllAccessories(!showAllAccessories)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    showAllAccessories
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                  title="Toggle between showing only compatible accessories or full catalog"
                >
                  <SlidersHorizontal size={11} />
                  <span>{showAllAccessories ? "Showing All Accessories" : "Show All Accessories"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAttachRecommendedSet}
                  className="text-[10px] px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  title="Automatically adds standard pins, wedges, tie rods, wing nuts, PVC cones & props proportional to panel quantity"
                >
                  <Sparkles size={11} />
                  <span>Attach Recommended Set</span>
                </button>
              </div>
            </div>

            {/* Quick-Select Compatible Accessories Pills */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span>Compatible Accessories for:</span>
                  <span className="text-amber-400 font-bold">{selectedPanelType}</span>
                  <span className="text-slate-500 font-mono">({panelCode})</span>
                </span>
                <span className="text-[10px] text-slate-500 italic">Click pill to toggle or customize</span>
              </div>

              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/60 rounded-xl border border-slate-800/80 max-h-32 overflow-y-auto">
                {MasterDataService.getDistinctAccessoryNames(compatibleAccessories).map(name => {
                  const isAttached = accessoriesList.some(a => a.accessoryName === name);
                  const isSelected = selectedAccName === name;
                  return (
                    <button
                      key={`pill-${name}`}
                      type="button"
                      onClick={() => handleToggleCompatibleAccessory(name)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-medium transition cursor-pointer ${
                        isAttached
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                          : isSelected
                          ? "bg-slate-800 text-white border-slate-700"
                          : "bg-slate-950/80 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-900"
                      }`}
                    >
                      {isAttached ? (
                        <CheckSquare size={12} className="text-amber-400" />
                      ) : (
                        <Square size={12} className="text-slate-500" />
                      )}
                      <span>{name}</span>
                      {isAttached && (
                        <span className="text-[9px] bg-amber-500 text-slate-950 px-1 rounded-full font-bold">
                          {accessoriesList.find(a => a.accessoryName === name)?.quantity}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cascading Accessory Configuration Form */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-1.5">
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  <PackagePlus size={13} className="text-amber-400" />
                  <span>Configure / Add Accessory to Panel</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Cascading Selection: Name → Type → Dimension → Code
                </span>
              </div>

              {/* Cascading Dropdowns: Level 1 (Name), Level 2 (Type), Level 3 (Dimension), Level 4 (Code) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <SearchableSmartDropdown
                    label="Accessory Name"
                    required
                    options={accNameOptions}
                    selectedValue={selectedAccName}
                    onSelect={opt => setSelectedAccName(opt.id)}
                    searchPlaceholder="Search accessory..."
                  />
                </div>

                <div>
                  <SearchableSmartDropdown
                    label="Accessory Type"
                    required
                    options={accTypeOptions}
                    selectedValue={selectedAccType}
                    onSelect={opt => setSelectedAccType(opt.id)}
                    searchPlaceholder="Filter type..."
                  />
                </div>

                <div>
                  <SearchableSmartDropdown
                    label="Standard Dimension"
                    required
                    options={accDimensionOptions}
                    selectedValue={selectedAccDimension}
                    onSelect={opt => setSelectedAccDimension(opt.id)}
                    searchPlaceholder="Standard dimension..."
                  />
                </div>

                <div>
                  <SearchableSmartDropdown
                    label="Accessory Code"
                    required
                    options={accCodeOptions}
                    selectedValue={selectedAccCode}
                    onSelect={opt => setSelectedAccCode(opt.id)}
                    searchPlaceholder="Accessory code..."
                  />
                </div>
              </div>

              {/* Master Catalog Specifications Preview */}
              {activeAccessoryCatalogItem && (
                <div className="p-2.5 bg-slate-950/90 rounded-lg border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <div className="flex items-center gap-3 text-slate-400">
                    <div>
                      <span className="text-slate-500">Mfr: </span>
                      <span className="text-slate-200 font-medium">{activeAccessoryCatalogItem.manufacturer}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Unit: </span>
                      <span className="text-amber-400 font-mono font-bold">{activeAccessoryCatalogItem.unit}</span>
                    </div>
                    {activeAccessoryCatalogItem.weightKg && (
                      <div>
                        <span className="text-slate-500">Weight: </span>
                        <span className="text-slate-200 font-mono">{activeAccessoryCatalogItem.weightKg} kg</span>
                      </div>
                    )}
                  </div>
                  <div className="text-slate-400 truncate max-w-xs italic">
                    {activeAccessoryCatalogItem.description}
                  </div>
                </div>
              )}

              {/* Accessory Instance Parameters: Quantity, Condition, Location, Serial & Status */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                <div>
                  <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    value={accQty}
                    onChange={e => setAccQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Condition</label>
                  <select
                    value={accCondition}
                    onChange={e => setAccCondition(e.target.value as PanelConditionType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Good">Good (ጥሩ)</option>
                    <option value="Fair">Fair (መካከለኛ)</option>
                    <option value="Maintenance Needed">Maintenance Needed (ጥገና የሚሻ)</option>
                    <option value="Damaged">Damaged (የተጎዳ)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Status</label>
                  <select
                    value={accStatus}
                    onChange={e => setAccStatus(e.target.value as PanelInventoryStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Available">Available (ዝግጁ)</option>
                    <option value="Reserved">Reserved (የተያዘ)</option>
                    <option value="In-Use">In-Use (በሥራ ላይ)</option>
                    <option value="Maintenance">Maintenance (ጥገና)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-0.5 text-[10px] font-bold">Storage Location</label>
                  <input
                    type="text"
                    value={accLocation}
                    onChange={e => setAccLocation(e.target.value)}
                    placeholder={computedLocation.formattedLocation || "Rack / Bin"}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddAccessory}
                    className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                  >
                    <Plus size={14} />
                    <span>Attach Component</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Attached Accessories Table (Prompt 5 & 8) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <ListPlus size={13} className="text-amber-400" />
                  <span>Configured Panel Accessories ({accessoriesList.length})</span>
                </span>
                {accessoriesList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAccessoriesList([])}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={11} />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {accessoriesList.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-center space-y-1">
                  <p className="text-xs text-slate-400 font-medium">
                    No accessories currently attached to this panel.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Select accessories from the chips above, configure custom dimensions, or click <span className="text-emerald-400 font-semibold cursor-pointer" onClick={handleAttachRecommendedSet}>"Attach Recommended Set"</span>.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px] sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2">Accessory</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Dimension</th>
                          <th className="px-3 py-2">Code</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2">Condition</th>
                          <th className="px-3 py-2">Location</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-2 py-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {accessoriesList.map(acc => (
                          <tr key={acc.id} className="hover:bg-slate-900/60 transition">
                            <td className="px-3 py-2 text-white font-bold">{acc.accessoryName}</td>
                            <td className="px-3 py-2 text-slate-400">{acc.accessoryType}</td>
                            <td className="px-3 py-2 font-mono text-amber-400">{acc.dimension}</td>
                            <td className="px-3 py-2 font-mono text-slate-300 font-semibold">{acc.accessoryCode}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-white">
                              {acc.quantity} <span className="text-[9px] text-slate-400 font-normal">{acc.unit}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                acc.condition === "Good"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : acc.condition === "Fair"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-red-500/20 text-red-400"
                              }`}>
                                {acc.condition}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-400 truncate max-w-[120px]">{acc.storageLocation}</td>
                            <td className="px-3 py-2">
                              <span className="text-[10px] text-slate-400">{acc.status}</span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveAccessory(acc.accessoryCode)}
                                className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                                title="Remove accessory"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-2 bg-slate-900/80 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>
                      Total Component Types: <strong className="text-white">{accessoriesList.length}</strong>
                    </span>
                    <span>
                      Total Pieces / Items: <strong className="text-amber-400">{accessoriesList.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0)} units</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: PANEL SITE & FACILITY ASSIGNMENT (Project -> Site -> Warehouse/Site Store) */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban size={14} />
                <span>3. Panel Facility Assignment (Project → Site → Warehouse / Site Store)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">Hierarchical Binding</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Assigned Project */}
              <div>
                <SearchableSmartDropdown
                  label={isAmharic ? "የተመደበለት ፕሮጀክት (Project)" : "Assigned Project"}
                  required
                  options={projectOptions}
                  selectedValue={assignedProjectId}
                  onSelect={opt => setAssignedProjectId(opt.id)}
                  searchPlaceholder="Filter project..."
                />
              </div>

              {/* Assigned Site (filtered by project) */}
              <div>
                <SearchableSmartDropdown
                  label={isAmharic ? "የተመደበለት ሳይት (Site)" : "Assigned Site"}
                  required
                  options={siteOptions}
                  selectedValue={assignedSiteId}
                  onSelect={opt => setAssignedSiteId(opt.id)}
                  searchPlaceholder="Filter site..."
                />
              </div>

              {/* Facility Type Selector */}
              <div>
                <label className="text-slate-400 block mb-1 font-bold">
                  {isAmharic ? "የተቋም ዓይነት (Facility Type)" : "Facility Type"}
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTargetFacilityType("warehouse")}
                    className={`py-1.5 text-center rounded-lg font-bold transition text-[11px] cursor-pointer ${
                      targetFacilityType === "warehouse"
                        ? "bg-amber-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Warehouse
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetFacilityType("site_store")}
                    className={`py-1.5 text-center rounded-lg font-bold transition text-[11px] cursor-pointer ${
                      targetFacilityType === "site_store"
                        ? "bg-amber-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Site Store
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {targetFacilityType === "warehouse" ? (
                <div>
                  <SearchableSmartDropdown
                    label={isAmharic ? "የተመደበለት መጋዘን (Warehouse)" : "Assigned Warehouse"}
                    required
                    options={warehouseOptions}
                    selectedValue={assignedWarehouseId}
                    onSelect={opt => setAssignedWarehouseId(opt.id)}
                    searchPlaceholder="Search warehouse..."
                  />
                </div>
              ) : (
                <div>
                  <SearchableSmartDropdown
                    label={isAmharic ? "የተመደበለት የሳይት ስቶር (Site Store)" : "Assigned Site Store"}
                    required
                    options={siteStoreOptions}
                    selectedValue={assignedSiteStoreId}
                    onSelect={opt => setAssignedSiteStoreId(opt.id)}
                    searchPlaceholder="Search site store..."
                  />
                </div>
              )}

              {/* Panel Storage Location Selector */}
              <div>
                <SearchableSmartDropdown
                  label={isAmharic ? "የማስቀመጫ መደብ / መደርደሪያ (Storage Location)" : "Storage Location"}
                  options={locationOptions}
                  selectedValue={selectedLocationId}
                  onSelect={opt => {
                    setSelectedLocationId(opt.id);
                    setIsEnteringCustomLocation(false);
                  }}
                  searchPlaceholder="Select existing location..."
                  allowAddNew={true}
                  addNewLabel={isAmharic ? "+ አዲስ መደብ / ራክ አስገባ" : "+ Add New Location / Enter New"}
                  onAddNewClick={() => setIsEnteringCustomLocation(true)}
                />
              </div>
            </div>

            {/* Manual New Location Entry Form & Duplicate/Similarity Warning */}
            {isEnteringCustomLocation && (
              <div className="mt-3 p-3.5 bg-slate-900 rounded-xl border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <MapPin size={13} />
                    <span>{isAmharic ? "አዲስ የማስቀመጫ መደብ መመዝገቢያ" : "Enter New Storage Location"}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEnteringCustomLocation(false)}
                    className="text-slate-400 hover:text-white text-[11px]"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-0.5 text-[10px]">Section *</label>
                    <input
                      type="text"
                      value={newSection}
                      onChange={e => setNewSection(e.target.value)}
                      placeholder="e.g. Section B"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5 text-[10px]">Rack</label>
                    <input
                      type="text"
                      value={newRack}
                      onChange={e => setNewRack(e.target.value)}
                      placeholder="e.g. Rack 03"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5 text-[10px]">Bay</label>
                    <input
                      type="text"
                      value={newBay}
                      onChange={e => setNewBay(e.target.value)}
                      placeholder="e.g. Bay 02"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5 text-[10px]">Row</label>
                    <input
                      type="text"
                      value={newRow}
                      onChange={e => setNewRow(e.target.value)}
                      placeholder="e.g. Row 01"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5 text-[10px]">Stack</label>
                    <input
                      type="text"
                      value={newStack}
                      onChange={e => setNewStack(e.target.value)}
                      placeholder="e.g. Stack 01"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5 text-[10px]">Bin</label>
                    <input
                      type="text"
                      value={newBin}
                      onChange={e => setNewBin(e.target.value)}
                      placeholder="e.g. B2"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* SIMILARITY WARNING BANNER */}
                {similarLocations.length > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl space-y-2 animate-fadeIn">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-300 block">
                          {isAmharic 
                            ? "ተመሳሳይ ነባር መደቦች ተገኝተዋል! ከእነዚህ ውስጥ አንዱን መጠቀም ይፈልጋሉ?" 
                            : "Similar existing locations found. Do you want to use one of these?"}
                        </span>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          To avoid accidental duplicate locations in the warehouse, check the matches below:
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {similarLocations.slice(0, 3).map((sim, i) => (
                        <div
                          key={`sim-${i}`}
                          className="flex items-center justify-between p-2 bg-slate-950/80 rounded-lg border border-slate-800"
                        >
                          <div className="truncate pr-2">
                            <span className="font-mono text-xs text-white font-semibold block truncate">
                              {sim.location.formattedLocation}
                            </span>
                            <span className="text-[10px] text-slate-400">{sim.reason}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLocationId(sim.location.id);
                              setIsEnteringCustomLocation(false);
                            }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-[10px] shrink-0 cursor-pointer transition"
                          >
                            Use This Location
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setHasConfirmedSimilarLocation(true)}
                        className={`text-[10px] px-3 py-1 rounded-lg border font-bold cursor-pointer transition ${
                          hasConfirmedSimilarLocation
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                        }`}
                      >
                        {hasConfirmedSimilarLocation
                          ? "✓ New Location Confirmed"
                          : "I Intentionally Want This New Location"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 4: CONDITION, STATUS, & FINANCIALS */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle size={14} />
                <span>4. Condition, Status & Valuation (ሁኔታ እና የዕቃ ዋጋ)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">Audited State</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Condition */}
              <div>
                <label className="text-slate-400 block mb-1 font-bold">
                  {isAmharic ? "የፓነል ሁኔታ (Condition) *" : "Panel Condition *"}
                </label>
                <select
                  value={condition}
                  onChange={e => setCondition(e.target.value as PanelConditionType)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="New">New (አዲስ ያልተጠቀሙበት)</option>
                  <option value="Good">Good (ጥሩ - ዝግጁ)</option>
                  <option value="Used">Used (ጥቅም ላይ የዋለ)</option>
                  <option value="Damaged">Damaged (የተጎዳ - ዕድሳት የሚፈልግ)</option>
                  <option value="Under Repair">Under Repair (በጥገና ላይ ያለ)</option>
                  <option value="Unusable">Unusable (ከጥቅም ውጪ - ስክራፕ)</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-slate-400 block mb-1 font-bold">
                  {isAmharic ? "የመጋዘን ዝግጁነት (Status) *" : "Inventory Status *"}
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as PanelInventoryStatus)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Available">Available (ለአገልግሎት ዝግጁ)</option>
                  <option value="Reserved">Reserved (ለፕሮጀክት የተያዘ)</option>
                  <option value="Issued">Issued (ወደ ሳይት የተላከ)</option>
                  <option value="Installed">Installed (በሳይት የተገጠመ)</option>
                  <option value="In Transit">In Transit (በጉዞ ላይ)</option>
                  <option value="Returned">Returned (የተመለሰ)</option>
                  <option value="Damaged">Damaged (ጉዳት የደረሰበት)</option>
                  <option value="Under Repair">Under Repair (በጥገና ላይ)</option>
                  <option value="Missing">Missing (የጠፋ / ያልተገኘ)</option>
                  <option value="Unusable">Unusable (የማያገለግል)</option>
                </select>
              </div>

              {/* Unit Cost */}
              <div>
                <label className="text-slate-400 block mb-1 font-bold">
                  {isAmharic ? "የአንዱ ፓነል ግምት ዋጋ (ETB)" : "Unit Value (ETB)"}
                </label>
                <input
                  type="number"
                  min="0"
                  value={unitCostEtb}
                  onChange={e => setUnitCostEtb(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 text-amber-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: QUANTITY & SERIAL NUMBERS */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash size={14} />
                <span>5. Quantity & Serial Number Management (ብዛት እና ተከታታይ ቁጥር)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">Dual Mode Generator</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">
                  {isAmharic ? "ጠቅላላ የፓነል ብዛት (Quantity) *" : "Panel Quantity *"}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-900 border border-slate-800 text-amber-400 font-mono text-base font-black rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">
                  {isAmharic ? "የተከታታይ ቁጥር አሞላል ዘዴ (Serial Mode)" : "Serial Input Mode"}
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSerialMode("Range")}
                    className={`py-1.5 text-center rounded-lg font-bold transition text-xs cursor-pointer ${
                      serialMode === "Range"
                        ? "bg-amber-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Mode A — Range
                  </button>
                  <button
                    type="button"
                    onClick={() => setSerialMode("Individual")}
                    className={`py-1.5 text-center rounded-lg font-bold transition text-xs cursor-pointer ${
                      serialMode === "Individual"
                        ? "bg-amber-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Mode B — Individual
                  </button>
                </div>
              </div>
            </div>

            {/* Mode A: Range */}
            {serialMode === "Range" ? (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Prefix</label>
                    <input
                      type="text"
                      value={serialPrefix}
                      onChange={e => setSerialPrefix(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-mono rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Starting #</label>
                    <input
                      type="text"
                      value={startNum}
                      onChange={e => setStartNum(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Ending #</label>
                    <input
                      type="text"
                      value={endNum}
                      onChange={e => setEndNum(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleGenerateSerials}
                      className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold flex items-center justify-center gap-1.5 cursor-pointer transition text-xs"
                    >
                      <Sparkles size={13} />
                      <span>Generate Serials</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Calculated Serial Range:{" "}
                  <span className="text-amber-400 font-bold">
                    {serialPrefix}-{startNum} → {serialPrefix}-{endNum}
                  </span>
                </div>
              </div>
            ) : (
              /* Mode B: Individual Serials */
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-bold">
                    {isAmharic 
                      ? "የተከታታይ ቁጥሮች ዝርዝር (አንዱ በአንድ መስመር)" 
                      : "Enter or scan individual serial numbers (one per line):"}
                  </label>
                  <span className={`font-mono text-[11px] font-bold ${
                    parsedIndividualSerials.length === quantity ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {parsedIndividualSerials.length} / {quantity} entered
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={individualInput}
                  onChange={e => setIndividualInput(e.target.value)}
                  placeholder={`WP-0001\nWP-0002\nWP-0003...`}
                  className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-mono text-xs rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
                />

                {isIndividualCountMismatch && (
                  <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle size={13} />
                    <span>
                      {isAmharic
                        ? `የተከታታይ ቁጥር ብዛት (${parsedIndividualSerials.length}) ከፓነል ብዛት (${quantity}) ጋር አይዛመድም።`
                        : `Serial number count (${parsedIndividualSerials.length}) does not match panel quantity (${quantity}).`}
                    </span>
                  </p>
                )}

                {hasDuplicateError && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle size={13} />
                    <span>Duplicate serial numbers detected. Please verify unique identifiers.</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 cursor-pointer transition font-bold"
            >
              {isAmharic ? "ይቅር" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition"
            >
              <CheckCircle size={16} />
              <span>{initialData ? (isAmharic ? "አድስ" : "Update Panel") : (isAmharic ? "መዝግብ" : "Save Panel Entry")}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog for Automatic Serial Generation */}
      {showConfirmGenerated && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles size={20} />
              <h4 className="font-bold text-base text-white">Confirm Generated Serial Numbers</h4>
            </div>
            <p className="text-xs text-slate-300">
              The system generated <strong className="text-amber-400">{tempGeneratedList.length}</strong> unique serial numbers:
            </p>
            <div className="max-h-48 overflow-y-auto bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 divide-y divide-slate-800/40">
              {tempGeneratedList.map((sn, idx) => (
                <div key={idx} className="py-1 flex justify-between">
                  <span className="text-slate-500">#{idx + 1}</span>
                  <span className="text-amber-400 font-bold">{sn}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmGenerated(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmGenerated}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
              >
                Confirm & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

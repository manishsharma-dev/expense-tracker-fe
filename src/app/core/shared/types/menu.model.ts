export interface SubMenuItem {
  label: string;
  route: string;
  icon?: string;
}
 
export interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  children?: SubMenuItem[];
  badge?: number;
}
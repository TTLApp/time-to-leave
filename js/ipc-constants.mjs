'use strict';

const IpcConstants = Object.freeze(
    {
        ChangeLanguage: 'CHANGE_LANGUAGE',
        ComputeAllTimeBalanceUntil: 'COMPUTE_ALL_TIME_BALANCE_UNTIL',
        DeleteStoreData: 'DELETE_STORE_DATA',
        DeleteWaiver: 'DELETE_WAIVER',
        GetCountries: 'GET_COUNTRIES',
        GetHolidays: 'GET_HOLIDAYS',
        GetLanguageData: 'GET_LANGUAGE_DATA',
        GetLeaveBy: 'GET_LEAVE_BY',
        GetRegions: 'GET_REGIONS',
        GetStates: 'GET_STATES',
        GetStoreContents: 'GET_STORE_CONTENTS',
        GetWaiverDay: 'GET_WAIVER_DAY',
        GetWaiverStoreContents: 'GET_WAIVER_STORE_CONTENTS',
        HasWaiver: 'HAS_WAIVER',
        PreferenceSaveDataNeeded: 'PREFERENCE_SAVE_DATA_NEEDED',
        PreferencesSaved: 'PREFERENCES_SAVED',
        PunchDate: 'PUNCH_DATE',
        ReceiveLeaveBy: 'RECEIVE_LEAVE_BY',
        RefreshOnDayChange: 'REFRESH_ON_DAY_CHANGE',
        ReloadCalendar: 'RELOAD_CALENDAR',
        ReloadTheme: 'RELOAD_THEME',
        SetStoreData: 'SET_STORE_DATA',
        SetWaiver: 'SET_WAIVER',
        SetWaiverDay: 'SET_WAIVER_DAY',
        ShowDialogSync: 'SHOW_DIALOG_SYNC',
        ShowDialog: 'SHOW_DIALOG',
        SwitchView: 'SWITCH_VIEW',
        ToggleTrayPunchTime: 'TOGGLE_TRAY_PUNCH_TIME',
        WaiverSaved: 'WAIVER_SAVED',
        WindowReadyToShow: 'WINDOW_READY_TO_SHOW',
    });

export default IpcConstants;

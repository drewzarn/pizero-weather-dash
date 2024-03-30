var ws;
const searchParams = new URLSearchParams(window.location.search);
const Tempest = {
    _wsid: undefined,
    get WSID() {
        if(!this._wsid) this._wsid = Math.floor(Math.random() * new Date().getTime());
        return this._wsid;
    },
    URLParam: function(p) {
        if(searchParams.has('t')) {
            let t = JSON.parse(atob(searchParams.get('t')));
            return t[p];
        }
        return false;
    },
    get Key() {
        if(this.URLParam('k')) return this.URLParam('k');
        return localStorage.getItem('tempest_key');
    },
    get DeviceID() {
        if(this.URLParam('d')) return this.URLParam('d');
        return localStorage.getItem('tempest_device');
    },
    get StationID() {
        if(this.URLParam('s')) return this.URLParam('s');
        return localStorage.getItem('tempest_station');
    },
    get WSListenStart() {
        let o = {
            type: 'listen_start',
            device_id: this.DeviceID,
            id: this.WSID
        };
        return JSON.stringify(o);
    },
    get WSListenRapidStart() {
        let o = {
            type: 'listen_rapid_start',
            device_id: this.DeviceID,
            id: this.WSID
        };
        return JSON.stringify(o);
    },
    get DataFields() {
        return [
            'Time',
            'WindLull',
            'WindAvg',
            'WindGust',
            'WindDirection',
            'WindSampleInterval',
            'Pressure',
            'Temperature',
            'RelativeHumidity',
            'Illuminance',
            'UVIndex',
            'SolarRadiation',
            'RainAccumulation',
            'PrecipitationType',
            'LightningStrikeAvgDistance',
            'LightningStrikeCount',
            'Battery',
            'ReportInterval',
            'RainAccumulationDaily',
            'RainAccumulationFinal',
            'RainAccumulationDailyFinal',
            'PrecipitationAnalysisType',
        ];
    }
}

function ActiveWindow(id) {
    $('body>div').hide();
    $('div#' + id).show();

    if(!id) {
        setTimeout(() => {
            if($('body>div:visible').length == 0) $('div#content').show();
        }, 200);
    }
}

$(document).ready(function () {
    if (Tempest.Key?.length != 36 || !Tempest.StationID || !Tempest.DeviceID) {
        ActiveWindow('config');
        $('#tempest_key').val(Tempest.Key);
        $('#tempest_device').val(Tempest.DeviceID);
        $('#tempest_station').val(Tempest.StationID);
    } else {
        ws = new WebSocket("wss://ws.weatherflow.com/swd/data?token=" + Tempest.Key);

        ws.onopen = (event) => {
            //ws.send('{"type":"listen_start_better_forecast","station_id":' + Tempest.StationID + ',"units_wind":"mph","units_distance":"mi"}');
            ws.send(Tempest.WSListenStart);
            ws.send(Tempest.WSListenRapidStart);
        }

        ws.onmessage = (event) => {
            let oData = JSON.parse(event.data);
            switch (oData.type) {
                case 'connection_opened':
                    break;
                case 'rapid_wind':
                    SetField("WindSpeed", oData.ob[1]);
                    SetField("WindDirection", oData.ob[2]);
                    break;
                case 'obs_st':
                    for(const [index, value] of oData.obs[0].entries()) {
                        SetField(Tempest.DataFields[index], value);
                    }
                    break;
                default:
                    console.log(oData);
                    break;
            }
            ActiveWindow();
        };
        ActiveWindow('current');
    }

    $('div#config input#save').click(function () {
        localStorage.setItem('tempest_key', $('#tempest_key').val());
        localStorage.setItem('tempest_device', $('#tempest_device').val());
        localStorage.setItem('tempest_station', $('#tempest_station').val());
        location.reload();
    });
});

SetField = function(field, value) {
    let $el = $('span[data-field="' + field + '"]');
    if($el.data('ctof')) value = value * 9 / 5 + 32;
    if($el.data('round')) value = Math.round(value);
    let text = value + ($el.data('unit') ? $el.data('unit') : '');
    $el.text(text);
}
unit Main;

interface

uses
  Windows, Messages, SysUtils, Variants, Classes, Graphics,
  Controls, Forms, uniGUITypes, uniGUIAbstractClasses,
  uniGUIClasses, uniGUIRegClasses, uniGUIForm, uniGUIBaseClasses, uniPanel,
  uniHTMLFrame, System.Net.URLClient, System.Net.HttpClient,
  System.Net.HttpClientComponent, REST.Types, REST.Client, Data.Bind.Components,
  Data.Bind.ObjectScope, System.JSON, NetEncoding, uniTimer, sgcBase_Classes,
  sgcSocket_Classes, sgcTCP_Classes, sgcWebSocket_Classes,
  sgcWebSocket_Classes_Indy, sgcWebSocket_Client, sgcWebSocket;

type
  TMainForm = class(TUniForm)
    MainHTML: TUniHTMLFrame;
    sgcWebSocketClient1: TsgcWebSocketClient;
    UniTimer1: TUniTimer;
    procedure UniFormCreate(Sender: TObject);
    procedure UniFormAfterShow(Sender: TObject);
    procedure MainHTMLAjaxEvent(Sender: TComponent; EventName: string;
      Params: TUniStrings);
    procedure sgcWebSocketClient1Connect(Connection: TsgcWSConnection);
    procedure sgcWebSocketClient1Message(Connection: TsgcWSConnection;
      const Text: string);
    procedure UniTimer1Timer(Sender: TObject);
    procedure sgcWebSocketClient1Exception(Connection: TsgcWSConnection;
      E: Exception);
    procedure UniFormDestroy(Sender: TObject);
  private
    { Private declarations }
    FRoomCode, FLastError: string;
    FIsConnected: Boolean;
    FNewConnectionFlag, FFirstDataLogged: Boolean;
    FLatestTelemetryData: string;
    FHasNewData: Boolean;
  public
    { Public declarations }
  end;

function MainForm: TMainForm;

implementation

{$R *.dfm}

uses
  uniGUIVars, MainModule, uniGUIApplication, ServerModule;

function MainForm: TMainForm;
begin
  Result := TMainForm(UniMainModule.GetFormInstance(TMainForm));
end;

procedure TMainForm.MainHTMLAjaxEvent(Sender: TComponent; EventName: string;
  Params: TUniStrings);
var
  Client: TNetHTTPClient;
  Response: IHTTPResponse;
  ReqURL, ReqYear, ReqSession, ReqDriver, ReqLap, ReqDriver1,
    ReqDriver2: string;
  JSONRes, TelemetryJSON: TJSONObject;
  YearsArray: TJSONArray;
  available_years_str: string;
  JSONValue: TJSONValue;
  RacesArray, SessionsArray, DriversArray: TJSONArray;
  RacesStr, ReqRaceName, SessionsStr, DriversStr, TelemetryStr: string;
begin
  if EventName = 'LoadYearsEvent' then // yılları getir
  begin
    Client := TNetHTTPClient.Create(nil);
    try
      try
        ReqURL := 'http://hasup.net:8000/api/v1/schedule/years';
        Response := Client.Get(ReqURL);

        if Response.StatusCode = 200 then
        begin
          JSONRes := TJSONObject.ParseJSONValue(Response.ContentAsString)
            as TJSONObject;
          if Assigned(JSONRes) then
          begin
            try
              if JSONRes.GetValue<String>('status') = 'success' then
              begin
                YearsArray := JSONRes.GetValue<TJSONArray>('available_years');

                if Assigned(YearsArray) then
                begin
                  available_years_str := YearsArray.ToJSON;

                  UniSession.AddJS('window.renderYears(' +
                    available_years_str + ');');
                end;
              end;
            finally
              JSONRes.Free;
            end;
          end;
        end;
      except
        on E: Exception do
          ShowMessage('API Bağlantı Hatası: ' + E.Message);
      end;
    finally
      Client.Free;
    end;
  end;

  if EventName = 'LoadRacesEvent' then // yarışları getir
  begin
    ReqYear := Params.Values['year'];

    Client := TNetHTTPClient.Create(nil);
    try
      try
        ReqURL := 'http://hasup.net:8000/api/v1/schedule/' + ReqYear + '/races';
        Response := Client.Get(ReqURL);

        if Response.StatusCode = 200 then
        begin
          JSONValue := TJSONObject.ParseJSONValue(Response.ContentAsString);

          if Assigned(JSONValue) then
          begin
            try
              RacesArray := nil;

              if JSONValue is TJSONArray then
              begin
                RacesArray := JSONValue as TJSONArray;
              end
              else if JSONValue is TJSONObject then
              begin

                (JSONValue as TJSONObject).TryGetValue<TJSONArray>('races',
                  RacesArray);
              end;

              // 5. Array elimizdeyse JS'e fırlat
              if Assigned(RacesArray) then
              begin
                RacesStr := RacesArray.ToJSON;
                UniSession.AddJS('window.renderRaces(' + RacesStr + ');');
              end
              else
              begin
                // Array bulunamadıysa UI kitlenmesin, boş dizi gönder
                UniSession.AddJS('window.renderRaces([]);');
              end;

            finally
              JSONValue.Free; // Bellek sızıntısını (Memory Leak) önle
            end;
          end;
        end
        else
        begin
          // HTTP 200 dönmezse UI'da şık hata mesajı çıkması için boş dizi gönder
          UniSession.AddJS('window.renderRaces([]);');
        end;
      except
        on E: Exception do
        begin
          // Herhangi bir bağlantı kopmasında uygulama çökmesin (Access Violation vermesin)
          UniSession.AddJS('window.renderRaces([]);');
        end;
      end;
    finally
      Client.Free; // İşimizi bitirip Client'ı yokediyoruz
    end;
  end;

  if EventName = 'LoadSessionsEvent' then
  begin
    // 1. JS tarafından yollanan parametreleri yakala
    ReqYear := Params.Values['year'];
    ReqRaceName := Params.Values['race_name'];

    Client := TNetHTTPClient.Create(nil);
    try
      try
        ReqURL := 'http://hasup.net:8000/api/v1/schedule/' + ReqYear + '/' +
          TNetEncoding.URL.Encode(ReqRaceName).Replace('+', '%20') +
          '/sessions';
        Response := Client.Get(ReqURL);

        if Response.StatusCode = 200 then
        begin
          // 3. Python API'miz bir TJSONObject döndürüyor, onu parse et
          JSONRes := TJSONObject.ParseJSONValue(Response.ContentAsString)
            as TJSONObject;

          if Assigned(JSONRes) then
          begin
            try
              // 4. Sadece ihtiyacımız olan "sessions" dizisini TryGetValue ile güvenlice çek
              if JSONRes.TryGetValue<TJSONArray>('sessions', SessionsArray) then
              begin
                SessionsStr := SessionsArray.ToJSON;
                // Veriyi JS'e fırlat!
                UniSession.AddJS('window.renderSessions(' + SessionsStr + ');');
              end
              else
              begin
                // "sessions" adında bir dizi bulamazsa UI donmasın, boş dizi yolla
                UniSession.AddJS('window.renderSessions([]);');
              end;
            finally
              JSONRes.Free; // Memory Leak engelleme
            end;
          end
          else
          begin
            UniSession.AddJS('window.renderSessions([]);');
          end;
        end
        else
        begin
          // HTTP 200 dönmezse UI'da şık hata mesajı çıkması için boş dizi gönder
          UniSession.AddJS('window.renderSessions([]);');
        end;
      except
        on E: Exception do
        begin
          // Herhangi bir HTTP bağlantı kopmasında uygulama çökmesin
          UniSession.AddJS('window.renderSessions([]);');
        end;
      end;
    finally
      Client.Free; // Client'ı yok et
    end;
  end;

  if EventName = 'LoadDriversEvent' then
  begin
    // 1. JS tarafından yollanan parametreleri yakala
    ReqYear := Params.Values['year'];
    ReqRaceName := Params.Values['race_name'];
    ReqSession := Params.Values['session_type'];

    Client := TNetHTTPClient.Create(nil);
    try
      try
        // 2. KESİN ÇÖZÜM: Hem yarış adını hem de seans adını (Practice 1) URL formatına (%20) çevir
        ReqURL := 'http://hasup.net:8000/api/v1/schedule/' + ReqYear + '/' +
          TNetEncoding.URL.Encode(ReqRaceName).Replace('+', '%20') + '/' +
          TNetEncoding.URL.Encode(ReqSession).Replace('+', '%20') + '/drivers';

        Response := Client.Get(ReqURL);

        if Response.StatusCode = 200 then
        begin
          // 3. Python API'mizden gelen JSON'u parse et
          JSONRes := TJSONObject.ParseJSONValue(Response.ContentAsString)
            as TJSONObject;

          if Assigned(JSONRes) then
          begin
            try
              // 4. Sadece ihtiyacımız olan "drivers" dizisini TryGetValue ile güvenlice çek
              if JSONRes.TryGetValue<TJSONArray>('drivers', DriversArray) then
              begin
                DriversStr := DriversArray.ToJSON;
                // Veriyi JS'e fırlat ve efsanevi animasyonu başlat!
                UniSession.AddJS('window.renderDrivers(' + DriversStr + ');');
              end
              else
              begin
                // "drivers" adında bir dizi bulamazsa UI donmasın, boş dizi yolla
                UniSession.AddJS('window.renderDrivers([]);');
              end;
            finally
              JSONRes.Free; // Memory Leak engelleme
            end;
          end
          else
          begin
            UniSession.AddJS('window.renderDrivers([]);');
          end;
        end
        else
        begin
          // HTTP 200 dönmezse UI'da hata için boş dizi gönder
          UniSession.AddJS('window.renderDrivers([]);');
        end;
      except
        on E: Exception do
        begin

          UniSession.AddJS('window.renderDrivers([]);');
        end;
      end;
    finally
      Client.Free; // İşimizi bitirip Client'ı yok ediyoruz
    end;
  end;

  // --- YENİ: Telemetri Verilerini Çeken Blok (PROJENİN KALBİ) ---
  if EventName = 'LoadTelemetryEvent' then
  begin
    // 1. JS tarafından yollanan parametreleri yakala
    ReqYear := Params.Values['year'];
    ReqRaceName := Params.Values['race_name'];
    ReqSession := Params.Values['session_type'];
    ReqDriver := Params.Values['driver_code'];
    ReqLap := Params.Values['lap']; // fastest veya 12 gibi

    Client := TNetHTTPClient.Create(nil);
    // Veri çok büyük olacağı için Timeout sürelerini artırmak hayat kurtarır (Ms cinsinden)
    Client.ConnectionTimeout := 10000; // 10 saniye bağlantı
    Client.ResponseTimeout := 60000;
    // 20 saniye yanıt (FastF1 bazen miss durumunda bekletir)

    try
      try
        // 2. URL'yi zırhla ve oluştur
        // API: hasup.net:8000/api/v1/telemetry/{year}/{race}/{session}/{driver}?lap={lap}
        ReqURL := 'http://hasup.net:8000/api/v1/telemetry/' + ReqYear + '/' +
          TNetEncoding.URL.Encode(ReqRaceName) + '/' + TNetEncoding.URL.Encode
          (ReqSession) + '/' + TNetEncoding.URL.Encode(ReqDriver) +
          '?lap=' + ReqLap;

        Response := Client.Get(ReqURL);

        if Response.StatusCode = 200 then
        begin
          // 3. Devasa JSON'ı parse et (İçinde binlerce telemetri noktası var)
          TelemetryJSON := TJSONObject.ParseJSONValue(Response.ContentAsString)
            as TJSONObject;

          if Assigned(TelemetryJSON) then
          begin
            try
              // 4. Tüm TJSONObject'i stringe çevirip JS'e fırlat.
              // Grafikleri JS tarafında parse edeceğiz.
              TelemetryStr := TelemetryJSON.ToJSON;

              // Veriyi JS'e fırlat ve o muazzam grafikleri çizme seansını başlat!
              UniSession.AddJS('window.renderTelemetry(' + TelemetryStr + ');');
            finally
              TelemetryJSON.Free; // Memory Leak engelleme
            end;
          end;
        end
        else
        begin
          // HATA DURUMU: UI donmasın diye null yolla, JS tarafta hata mesajı gösteririz.
          UniSession.AddJS('window.renderTelemetry(null);');
        end;
      except
        on E: Exception do
        begin
          // Zaman aşımı veya kopma durumunda UI'ı kurtar
          UniSession.AddJS('window.renderTelemetry(null);');
        end;
      end;
    finally
      Client.Free; // Client'ı yok et
    end;
  end;

  if EventName = 'LoadLapsSummaryEvent' then
  begin
    ReqYear := Params.Values['year'];
    ReqRaceName := Params.Values['race_name'];
    ReqSession := Params.Values['session_type'];
    ReqDriver := Params.Values['driver_code'];

    Client := TNetHTTPClient.Create(nil);
    try
      // Senin yazdığın o hızlı ve hafif Python endpoint'i
      ReqURL := 'http://hasup.net:8000/api/v1/laps/' + ReqYear + '/' +
        TNetEncoding.URL.Encode(ReqRaceName) + '/' + TNetEncoding.URL.Encode
        (ReqSession) + '/' + TNetEncoding.URL.Encode(ReqDriver);

      Response := Client.Get(ReqURL);

      if Response.StatusCode = 200 then
      begin
        // Veriyi JS tarafındaki Ribbon çiziciye gönderiyoruz, currentLapReq olarak şimdilik fastest gönderiyoruz
        UniSession.AddJS('window.updateLapsRibbon(' + Response.ContentAsString +
          ', "fastest");');
      end;
    finally
      Client.Free;
    end;
  end;

  if EventName = 'LoadCompareEvent' then
  begin
    ReqYear := Params.Values['year'];
    ReqRaceName := Params.Values['race_name'];
    ReqSession := Params.Values['session_type'];
    ReqDriver1 := Params.Values['driver1'];
    ReqDriver2 := Params.Values['driver2'];
    ReqLap := Params.Values['lap'];

    Client := TNetHTTPClient.Create(nil);
    try
      // Python'daki efsanevi Compare Endpoint'in
      ReqURL := 'http://hasup.net:8000/api/v1/compare/' + ReqYear + '/' +
        TNetEncoding.URL.Encode(ReqRaceName) + '/' + TNetEncoding.URL.Encode
        (ReqSession) + '/' + ReqDriver1 + '/' + ReqDriver2 + '?lap=' + ReqLap;

      Response := Client.Get(ReqURL);

      if Response.StatusCode = 200 then
      begin
        // İkili veriyi JS tarafındaki YENİ çizici fonksiyona gönder
        UniSession.AddJS('window.renderCompare(' +
          Response.ContentAsString + ');');
      end;
    finally
      Client.Free;
    end;
  end;

  if EventName = 'ConnectTelemetryRoom' then
  begin
    FRoomCode := Params.Values['roomCode'];

    FFirstDataLogged := False;

    if sgcWebSocketClient1.Active then
      sgcWebSocketClient1.Active := False;

    // DİKKAT: Host ve Port ayarlarını ezip, sgc'ye TAM ADRESİ veriyoruz (En garanti yöntem)
    sgcWebSocketClient1.URL := 'ws://hasup.net:8000/ws/live/' + FRoomCode;

    // Motoru Ateşle!
    sgcWebSocketClient1.Active := True;
  end

  else if EventName = 'DisconnectTelemetryRoom' then
  begin
    sgcWebSocketClient1.Active := False;
    FIsConnected := False;
  end;

end;

procedure TMainForm.sgcWebSocketClient1Connect(Connection: TsgcWSConnection);
begin
  FIsConnected := True;
  FNewConnectionFlag := True;
end;

procedure TMainForm.sgcWebSocketClient1Exception(Connection: TsgcWSConnection;
  E: Exception);
begin
  FLastError := E.Message
end;

procedure TMainForm.sgcWebSocketClient1Message(Connection: TsgcWSConnection;
  const Text: string);
begin
  FLatestTelemetryData := Text;
  FHasNewData := True;
end;

procedure TMainForm.UniFormAfterShow(Sender: TObject);
begin
  UniSession.AddJS('window.initTelemetriaCore();');
end;

procedure TMainForm.UniFormCreate(Sender: TObject);
begin
  MainHTML.HTML.LoadFromFile(UniServerModule.FilesFolderPath +
    '/main_form.html', TEncoding.UTF8);
end;

procedure TMainForm.UniFormDestroy(Sender: TObject);
begin
  if Assigned(sgcWebSocketClient1) then
  begin
    if sgcWebSocketClient1.Active then
      sgcWebSocketClient1.Active := False;
  end;
end;

procedure TMainForm.UniTimer1Timer(Sender: TObject);
begin
  // 1. Yeni Bağlantı Varsa JS'i Uyar
  if FNewConnectionFlag then
  begin
    FNewConnectionFlag := False;
    UniSession.AddJS('window.acConnectionEstablished("' + FRoomCode + '");');
  end;

  // 2. Yeni Telemetri Verisi Varsa JS'e Pompala
  if FHasNewData then
  begin
    FHasNewData := False;

    // Sadece ilk paket geldiğinde tarayıcıya "Veri Akıyor!" diye bağıralım
    if not FFirstDataLogged then
    begin
      FFirstDataLogged := True;
    end;

    // HAYAT KURTARAN DOKUNUŞ: JSON içindeki olası alt satır (Enter) boşluklarını temizle!
    FLatestTelemetryData := StringReplace(FLatestTelemetryData, #13, '',
      [rfReplaceAll]);
    FLatestTelemetryData := StringReplace(FLatestTelemetryData, #10, '',
      [rfReplaceAll]);

    // Temizlenmiş JSON'u JS fonksiyonuna fırlat
    UniSession.AddJS('window.updateACTelemetry(' + FLatestTelemetryData + ');');
  end;

  // 3. Arka Planda Hata Patladıysa JS Konsoluna Yaz
  if FLastError <> '' then
  begin
    // Delphi'nin TString'ini JS string'ine çevirirken tırnaklara dikkat
    UniSession.AddJS('console.error("[DELPHI WS HATASI]: ' + FLastError
      + '");');
    FLastError := ''; // Hatayı gösterdik, içini boşalt
  end;
end;

initialization

RegisterAppFormClass(TMainForm);

end.

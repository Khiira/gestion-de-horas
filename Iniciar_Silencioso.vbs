Set WshShell = CreateObject("WScript.Shell")
Set objWMIService = GetObject("winmgmts:\\.\root\cimv2")

' Terminar instancias previas de app.py o la versión portable en segundo plano para evitar conflictos de puerto y recargar cambios
On Error Resume Next
Set colProcesses = objWMIService.ExecQuery("Select * from Win32_Process Where Name = 'pythonw.exe' or Name = 'python.exe' or Name = 'Gestion_de_Horas_Portable.exe'")
For Each objProcess in colProcesses
    If InStr(1, objProcess.CommandLine, "app.py", 1) > 0 Or objProcess.Name = "Gestion_de_Horas_Portable.exe" Then
        objProcess.Terminate()
    End If
Next
On Error GoTo 0

WScript.Sleep 600

WshShell.CurrentDirectory = "C:\Users\IgnacioLedezma\Desktop\Codigos Utiles\Trabajo\Gestion de HORAS"
' Ejecutar en segundo plano con pythonw para no mostrar consola (0 = oculto, False = no esperar)
WshShell.Run "pythonw.exe app.py", 0, False

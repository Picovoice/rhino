using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using UnityEngine;
using UnityEngine.UI;

using Pv.Unity;

public class RhinoDemo : MonoBehaviour
{
    Button _startButton;
    Image[] _locationStates;
        
    private bool _isProcessing;    

    RhinoManager _rhinoManager;

    private static readonly string _platform;
    private readonly Dictionary<string, Color> _colourLookup = new Dictionary<string, Color>()
    {
        { "none", new Color(0,0,0,1) },
        { "blue", new Color(0,0,1,1) },
        { "green", new Color(0,1,0,1) },
        { "orange", new Color(0.5f,1,0,1) },
        { "pink", new Color(1,0,0.5f,1) },
        { "purple", new Color(1,0,1,1) },
        { "red", new Color(1,0,0,1) },
        { "white", new Color(1,1,1,1) },
        { "yellow", new Color(1,1,0,1) },
    };

    static RhinoDemo()
    {
        _platform = GetPlatform();
    }

    void Start()
    {
        _startButton = gameObject.GetComponentInChildren<Button>();
        _startButton.onClick.AddListener(ToggleProcessing);
        _locationStates = gameObject.GetComponentsInChildren<Image>().Where(i => i.name != "ToggleListeningButton").ToArray();
        string contextPath = string.Format("contexts/{0}/smart_lighting_{1}.rhn", _platform, _platform);
        contextPath = Path.Combine(Application.streamingAssetsPath, contextPath);
        try
        {
            _rhinoManager = RhinoManager.Create(contextPath, OnInferenceResult);
        }
        catch (Exception ex)
        {
            Debug.LogError("RhinoManager was unable to initialize: " + ex.ToString());
        }
    }

    private void ToggleProcessing()
    {
        if (!_isProcessing)
        {
            StartProcessing();
        }
    }

    private void StartProcessing()
    {
        (_startButton.targetGraphic as Text).text = "...";
        _startButton.enabled = false;
        _rhinoManager.Process();
        _isProcessing = true;
    }

    private void OnInferenceResult(Inference inference)
    {
        if (inference.IsUnderstood)
        {
            if (inference.Intent == "changeColor")
            {
                Color newColour = _colourLookup["white"];
                if (inference.Slots.ContainsKey("color"))
                {
                    newColour = _colourLookup[inference.Slots["color"]];
                }

                Image[] locations = _locationStates;
                if (inference.Slots.ContainsKey("location"))
                {
                    string locationName = inference.Slots["location"];
                    locations = _locationStates.Where(g => g.name == locationName).ToArray();
                }

                ChangeLightColour(locations, newColour);
            }
            else if (inference.Intent == "changeLightState")
            {
                bool state = false;
                if (inference.Slots.ContainsKey("state"))
                {
                    state = inference.Slots["state"] == "on";                    
                }

                Image[] locations = _locationStates;
                if (inference.Slots.ContainsKey("location"))
                {
                    string locationName = inference.Slots["location"];
                    locations = _locationStates.Where(g => g.name == locationName).ToArray();                       
                }

                ChangeLightState(locations, state);
            }
            else if (inference.Intent == "changeLightStateOff")
            {
                Image[] locations = _locationStates;
                if (inference.Slots.ContainsKey("location"))
                {
                    string locationName = inference.Slots["location"];
                    locations = _locationStates.Where(g => g.name == locationName).ToArray();
                }

                ChangeLightState(locations, false);
            }
        }
        else
        {
            Debug.Log("Didn't understand the command.\n");
        }

        (_startButton.targetGraphic as Text).text = "Start Listening";
        _startButton.enabled = true;
        _isProcessing = false;
    }

    private void ChangeLightState(Image[] locations, bool state) 
    {        
        float alphaValue = state ? 1 : 0.1f;
        for (int i = 0; i < locations.Length; i++)
        {
            Color c = locations[i].color;
            c.a = alphaValue;
            locations[i].color = c;
        }
    }

    private void ChangeLightColour(Image[] locations, Color colour)
    {
        for (int i = 0; i < locations.Length; i++)
        {
            locations[i].color = colour;
        }
    }

    void Update()
    {

    }

    void OnApplicationQuit()
    {
        if (_rhinoManager != null)
        {
            _rhinoManager.Delete();
        }
    }

    private static string GetPlatform()
    {
        switch (Application.platform)
        {
            case RuntimePlatform.WindowsEditor:
            case RuntimePlatform.WindowsPlayer:
                return "windows";
            case RuntimePlatform.OSXEditor:
            case RuntimePlatform.OSXPlayer:
                return "mac";
            case RuntimePlatform.LinuxEditor:
            case RuntimePlatform.LinuxPlayer:
                return "linux";
            case RuntimePlatform.IPhonePlayer:
                return "ios";
            case RuntimePlatform.Android:
                return "android";
            default:
                throw new NotSupportedException(string.Format("Platform '{0}' not supported by Porcupine Unity binding", Application.platform));
        }
    }
}

# Rhino

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)


## Table of Contents
* [Motivation](#motivation)
* [Structure of Repository](#structure-of-repository)
* [Running Demo Applications](#running-demo-applications)
    * [Running Python Demo Application](#running-python-demo-application)
* [Integration](#integration)
    * [Python](#python)
    * [C](#c)
* [Releases](#releases)

## Motivation

## Structure of Repository

## Running Demo Applications

### Running Python Demo Application

```bash
python demo/python/rhino_demo.py --help
```

```bash
python demo/python/rhino_demo.py --rhino_context_file_path=resources/contexts/coffee_maker.pv \
--porcupine_keyword_file_path=resources/porcupine/resources/keyword_files/alfred_linux.ppn
```

## Integration

### Python

```python
    library_path = ... # absolute path to Rhino's dynamic library
    model_file_path = ... # available at lib/common/rhino_params.pv
    context_file_path = ... # absolute path to Rhino's context file for the given context
    
    rhino = Rhino(library_path=library_path, model_file_path=model_file_path, context_file_path=context_file_path) 
```

```python
    def get_next_audio_frame():
        pass
    
    is_finalized = False
    
    while not is_finalized:
        is_finalized = rhino.process(get_next_audio_frame())
        
        if is_finalized:
            if rhino.is_understood():
                for attribute in rhino.get_attributes():
                    attribute_value = rhino.get_attribute_value(attribute)
            
                # logic to take action based on attributes and their values
            else:
                # logic to handle unsupported command
```

```python
    rhino.delete()
```

### C

```c
    const char *model_file_path = .../ available at lib/common/rhino_params.pv
    const char *context_file_path = ... / absolute path to Rhino's context file for the context of interest
    
    pv_rhino_object_t *handle;
    const pv_status_t status = pv_rhino_init(model_file_path, context_file_path, &handle);
    if (status != PV_STATUS_SUCCESS) {
        // error handling logic goes here
    }
```

```c
    extern const int16_t *get_next_audio_frame(void);
    
    while (true) {
        const int16_t *pcm = get_next_audio_frame();
        
        bool is_finalized;
        pv_status_t status = pv_rhino_process(handle, pcm, &is_finalized);
        if (status != PV_STATUS_SUCCESS) {
            // error handling logic goes here
        }
        
        if (is_finalized) {
            bool is_understood;
            status = pv_rhino_is_understood(handle, &is_understood);
            if (status != PV_STATUS_SUCCESS) {
                // error handling logic goes here
            }
            
            if (is_understood) {
                int num_attribtes;
                char **attributes;
                status = pv_rhino_get_attributes(handle, num_attributes, attributes);
                if (status != PV_STATUS_SUCCESS) {
                    // error handling logic goes here
                }
                
                for (int i = 0; i < num_attributes; i++) {
                    char *attribute_value;
                    status = pv_rhino_get_attribute_value(handle, attributes[i], &attribute_value)
                    if (status != PV_STATUS_SUCCESS) {
                        // error handling logic goes here
                    }
                    
                    // logic to take an action based on attribute value
                }
                
                free(attributes);
            }
            else {
                // logic to handle out of context commands
            }
        }
    }
```

```c
    pv_rhino_delete(handle);
```

##Releases

### v1.0.0 November 2nd, 2018

* Initial Release
